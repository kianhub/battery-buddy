#include <libimobiledevice/companion_proxy.h>
#include <libimobiledevice/libimobiledevice.h>
#include <plist/plist.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>

static void sanitize(char* value)
{
	if (!value) {
		return;
	}
	for (char* p = value; *p; p++) {
		if (*p == '\t' || *p == '\r' || *p == '\n') {
			*p = ' ';
		}
	}
}

static char* strdup_or_default(const char* value, const char* fallback)
{
	if (value && value[0] != '\0') {
		char* out = strdup(value);
		if (out) {
			sanitize(out);
		}
		return out;
	}
	return strdup(fallback);
}

static bool plist_to_string(plist_t node, char** out)
{
	if (!node || !out) {
		return false;
	}

	plist_type t = plist_get_node_type(node);
	if (t == PLIST_STRING) {
		char* value = NULL;
		plist_get_string_val(node, &value);
		if (value) {
			sanitize(value);
			*out = value;
			return true;
		}
		return false;
	}

	if (t == PLIST_UINT) {
		uint64_t v = 0;
		plist_get_uint_val(node, &v);
		char buf[32];
		snprintf(buf, sizeof(buf), "%llu", (unsigned long long)v);
		*out = strdup(buf);
		return (*out != NULL);
	}

	if (t == PLIST_BOOLEAN) {
		uint8_t v = 0;
		plist_get_bool_val(node, &v);
		*out = strdup(v ? "true" : "false");
		return (*out != NULL);
	}

	if (t == PLIST_DICT) {
		plist_t item = plist_dict_get_item(node, "DeviceName");
		if (!item) item = plist_dict_get_item(node, "Name");
		if (!item) item = plist_dict_get_item(node, "ProductType");
		if (!item) item = plist_dict_get_item(node, "BatteryCurrentCapacity");
		if (!item) item = plist_dict_get_item(node, "BatteryLevel");
		if (!item) item = plist_dict_get_item(node, "BatteryIsCharging");
		if (!item) item = plist_dict_get_item(node, "IsCharging");
		if (item) {
			return plist_to_string(item, out);
		}
	}

	return false;
}

static bool plist_to_int(plist_t node, int* out)
{
	if (!node || !out) {
		return false;
	}

	plist_type t = plist_get_node_type(node);
	if (t == PLIST_UINT) {
		uint64_t v = 0;
		plist_get_uint_val(node, &v);
		*out = (int)v;
		return true;
	}

	if (t == PLIST_BOOLEAN) {
		uint8_t v = 0;
		plist_get_bool_val(node, &v);
		*out = v ? 1 : 0;
		return true;
	}

	if (t == PLIST_STRING) {
		char* value = NULL;
		plist_get_string_val(node, &value);
		if (!value) {
			return false;
		}
		*out = atoi(value);
		free(value);
		return true;
	}

	if (t == PLIST_DICT) {
		plist_t item = plist_dict_get_item(node, "BatteryCurrentCapacity");
		if (!item) item = plist_dict_get_item(node, "BatteryLevel");
		if (item) {
			return plist_to_int(item, out);
		}
	}

	return false;
}

static bool plist_to_bool(plist_t node, bool* out)
{
	if (!node || !out) {
		return false;
	}

	plist_type t = plist_get_node_type(node);
	if (t == PLIST_BOOLEAN) {
		uint8_t v = 0;
		plist_get_bool_val(node, &v);
		*out = (v != 0);
		return true;
	}

	if (t == PLIST_UINT) {
		uint64_t v = 0;
		plist_get_uint_val(node, &v);
		*out = (v != 0);
		return true;
	}

	if (t == PLIST_STRING) {
		char* value = NULL;
		plist_get_string_val(node, &value);
		if (!value) {
			return false;
		}
		if (strcasecmp(value, "true") == 0 || strcmp(value, "1") == 0 || strcasecmp(value, "yes") == 0) {
			*out = true;
			free(value);
			return true;
		}
		if (strcasecmp(value, "false") == 0 || strcmp(value, "0") == 0 || strcasecmp(value, "no") == 0) {
			*out = false;
			free(value);
			return true;
		}
		free(value);
		return false;
	}

	if (t == PLIST_DICT) {
		plist_t item = plist_dict_get_item(node, "BatteryIsCharging");
		if (!item) item = plist_dict_get_item(node, "IsCharging");
		if (item) {
			return plist_to_bool(item, out);
		}
	}

	return false;
}

static int fetch_registry_value(idevice_t device, const char* companion_udid, const char* key, plist_t* value)
{
	if (!device || !companion_udid || !key || !value) {
		return -1;
	}

	companion_proxy_client_t cp = NULL;
	companion_proxy_error_t cpe = companion_proxy_client_start_service(device, &cp, "watch-helper");
	if (cpe != COMPANION_PROXY_E_SUCCESS || !cp) {
		return (int)cpe;
	}

	companion_proxy_error_t ge = companion_proxy_get_value_from_registry(cp, companion_udid, key, value);
	companion_proxy_client_free(cp);
	return (int)ge;
}

int main(int argc, char** argv)
{
	if (argc != 2) {
		fprintf(stderr, "usage: %s <iphone_udid>\n", argv[0]);
		return 2;
	}

	const char* phone_udid = argv[1];
	idevice_t device = NULL;
	if (idevice_new_with_options(&device, phone_udid, IDEVICE_LOOKUP_USBMUX | IDEVICE_LOOKUP_NETWORK) != IDEVICE_E_SUCCESS || !device) {
		fprintf(stderr, "Unable to open iPhone %s\n", phone_udid);
		return 1;
	}

	companion_proxy_client_t cp = NULL;
	companion_proxy_error_t se = companion_proxy_client_start_service(device, &cp, "watch-helper");
	if (se != COMPANION_PROXY_E_SUCCESS || !cp) {
		fprintf(stderr, "Unable to start companion_proxy service (error %d)\n", (int)se);
		idevice_free(device);
		return 1;
	}

	plist_t watch_udids = NULL;
	companion_proxy_error_t re = companion_proxy_get_device_registry(cp, &watch_udids);
	companion_proxy_client_free(cp);
	if (re != COMPANION_PROXY_E_SUCCESS) {
		if (re != COMPANION_PROXY_E_NO_DEVICES) {
			fprintf(stderr, "Unable to read watch registry (error %d)\n", (int)re);
		}
		idevice_free(device);
		return (re == COMPANION_PROXY_E_NO_DEVICES) ? 0 : 1;
	}

	if (!watch_udids || plist_get_node_type(watch_udids) != PLIST_ARRAY) {
		plist_free(watch_udids);
		idevice_free(device);
		return 0;
	}

	uint32_t n = plist_array_get_size(watch_udids);
	for (uint32_t i = 0; i < n; i++) {
		plist_t udid_node = plist_array_get_item(watch_udids, i);
		char* watch_udid = NULL;
		if (!plist_to_string(udid_node, &watch_udid) || !watch_udid || !watch_udid[0]) {
			free(watch_udid);
			continue;
		}

		char* watch_name = NULL;
		char* watch_model = NULL;
		int battery_level = 0;
		bool charging = false;

		plist_t value = NULL;
		if (fetch_registry_value(device, watch_udid, "DeviceName", &value) == COMPANION_PROXY_E_SUCCESS && value) {
			plist_to_string(value, &watch_name);
			plist_free(value);
		}
		value = NULL;
		if (!watch_name && fetch_registry_value(device, watch_udid, "Name", &value) == COMPANION_PROXY_E_SUCCESS && value) {
			plist_to_string(value, &watch_name);
			plist_free(value);
		}

		value = NULL;
		if (fetch_registry_value(device, watch_udid, "ProductType", &value) == COMPANION_PROXY_E_SUCCESS && value) {
			plist_to_string(value, &watch_model);
			plist_free(value);
		}
		value = NULL;
		if (!watch_model && fetch_registry_value(device, watch_udid, "Model", &value) == COMPANION_PROXY_E_SUCCESS && value) {
			plist_to_string(value, &watch_model);
			plist_free(value);
		}

		value = NULL;
		if (fetch_registry_value(device, watch_udid, "BatteryCurrentCapacity", &value) == COMPANION_PROXY_E_SUCCESS && value) {
			plist_to_int(value, &battery_level);
			plist_free(value);
		}
		value = NULL;
		if (battery_level <= 0 && fetch_registry_value(device, watch_udid, "BatteryLevel", &value) == COMPANION_PROXY_E_SUCCESS && value) {
			plist_to_int(value, &battery_level);
			plist_free(value);
		}

		value = NULL;
		if (fetch_registry_value(device, watch_udid, "BatteryIsCharging", &value) == COMPANION_PROXY_E_SUCCESS && value) {
			plist_to_bool(value, &charging);
			plist_free(value);
		}
		value = NULL;
		if (!charging && fetch_registry_value(device, watch_udid, "IsCharging", &value) == COMPANION_PROXY_E_SUCCESS && value) {
			plist_to_bool(value, &charging);
			plist_free(value);
		}

		if (battery_level < 0) battery_level = 0;
		if (battery_level > 100) battery_level = 100;

		char* safe_name = strdup_or_default(watch_name, "Apple Watch");
		char* safe_model = strdup_or_default(watch_model, "Unknown Watch");
		char* safe_udid = strdup_or_default(watch_udid, "unknown-watch");
		printf("WATCH\t%s\t%s\t%s\t%d\t%s\n",
			safe_udid ? safe_udid : "unknown-watch",
			safe_name ? safe_name : "Apple Watch",
			safe_model ? safe_model : "Unknown Watch",
			battery_level,
			charging ? "true" : "false");

		free(watch_udid);
		free(watch_name);
		free(watch_model);
		free(safe_name);
		free(safe_model);
		free(safe_udid);
	}

	plist_free(watch_udids);
	idevice_free(device);
	return 0;
}
