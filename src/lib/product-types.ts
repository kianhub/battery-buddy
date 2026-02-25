const IPHONE_PRODUCT_TYPE_TO_NAME: Record<string, string> = {
  "iPhone10,1": "iPhone 8",
  "iPhone10,2": "iPhone 8 Plus",
  "iPhone10,3": "iPhone X",
  "iPhone10,4": "iPhone 8",
  "iPhone10,5": "iPhone 8 Plus",
  "iPhone10,6": "iPhone X",
  "iPhone11,2": "iPhone XS",
  "iPhone11,4": "iPhone XS Max",
  "iPhone11,6": "iPhone XS Max",
  "iPhone11,8": "iPhone XR",
  "iPhone12,1": "iPhone 11",
  "iPhone12,3": "iPhone 11 Pro",
  "iPhone12,5": "iPhone 11 Pro Max",
  "iPhone12,8": "iPhone SE (2nd generation)",
  "iPhone13,1": "iPhone 12 mini",
  "iPhone13,2": "iPhone 12",
  "iPhone13,3": "iPhone 12 Pro",
  "iPhone13,4": "iPhone 12 Pro Max",
  "iPhone14,2": "iPhone 13 Pro",
  "iPhone14,3": "iPhone 13 Pro Max",
  "iPhone14,4": "iPhone 13 mini",
  "iPhone14,5": "iPhone 13",
  "iPhone14,6": "iPhone SE (3rd generation)",
  "iPhone14,7": "iPhone 14",
  "iPhone14,8": "iPhone 14 Plus",
  "iPhone15,2": "iPhone 14 Pro",
  "iPhone15,3": "iPhone 14 Pro Max",
  "iPhone15,4": "iPhone 15",
  "iPhone15,5": "iPhone 15 Plus",
  "iPhone16,1": "iPhone 15 Pro",
  "iPhone16,2": "iPhone 15 Pro Max",
  "iPhone17,1": "iPhone 16 Pro",
  "iPhone17,2": "iPhone 16 Pro Max",
  "iPhone17,3": "iPhone 16",
  "iPhone17,4": "iPhone 16 Plus",
};

const WATCH_PRODUCT_TYPE_TO_NAME: Record<string, string> = {
  "Watch1,1": "Apple Watch (1st generation) 38mm",
  "Watch1,2": "Apple Watch (1st generation) 42mm",
  "Watch2,3": "Apple Watch Series 2 38mm",
  "Watch2,4": "Apple Watch Series 2 42mm",
  "Watch2,6": "Apple Watch Series 1 38mm",
  "Watch2,7": "Apple Watch Series 1 42mm",
  "Watch3,1": "Apple Watch Series 3 38mm",
  "Watch3,2": "Apple Watch Series 3 42mm",
  "Watch3,3": "Apple Watch Series 3 38mm",
  "Watch3,4": "Apple Watch Series 3 42mm",
  "Watch4,1": "Apple Watch Series 4 40mm",
  "Watch4,2": "Apple Watch Series 4 44mm",
  "Watch4,3": "Apple Watch Series 4 40mm",
  "Watch4,4": "Apple Watch Series 4 44mm",
  "Watch5,1": "Apple Watch Series 5 40mm",
  "Watch5,2": "Apple Watch Series 5 44mm",
  "Watch5,3": "Apple Watch Series 5 40mm",
  "Watch5,4": "Apple Watch Series 5 44mm",
  "Watch5,9": "Apple Watch SE 40mm",
  "Watch5,10": "Apple Watch SE 44mm",
  "Watch5,11": "Apple Watch SE 40mm",
  "Watch5,12": "Apple Watch SE 44mm",
  "Watch6,1": "Apple Watch Series 6 40mm",
  "Watch6,2": "Apple Watch Series 6 44mm",
  "Watch6,3": "Apple Watch Series 6 40mm",
  "Watch6,4": "Apple Watch Series 6 44mm",
  "Watch6,6": "Apple Watch Series 7 41mm",
  "Watch6,7": "Apple Watch Series 7 45mm",
  "Watch6,8": "Apple Watch Series 7 41mm",
  "Watch6,9": "Apple Watch Series 7 45mm",
  "Watch6,10": "Apple Watch SE (2nd generation) 40mm",
  "Watch6,11": "Apple Watch SE (2nd generation) 44mm",
  "Watch6,12": "Apple Watch SE (2nd generation) 40mm",
  "Watch6,13": "Apple Watch SE (2nd generation) 44mm",
  "Watch6,14": "Apple Watch Series 8 41mm",
  "Watch6,15": "Apple Watch Series 8 45mm",
  "Watch6,16": "Apple Watch Series 8 41mm",
  "Watch6,17": "Apple Watch Series 8 45mm",
  "Watch6,18": "Apple Watch Ultra",
  "Watch7,1": "Apple Watch Series 9 41mm",
  "Watch7,2": "Apple Watch Series 9 45mm",
  "Watch7,3": "Apple Watch Series 9 41mm",
  "Watch7,4": "Apple Watch Series 9 45mm",
  "Watch7,5": "Apple Watch Ultra 2",
};

export function formatIPhoneModel(productType: string | undefined): string {
  if (!productType) {
    return "Unknown Model";
  }

  const name = IPHONE_PRODUCT_TYPE_TO_NAME[productType];
  if (!name) {
    return productType;
  }

  return `${name} (${productType})`;
}

export function formatWatchModel(productType: string | undefined): string {
  if (!productType) {
    return "Unknown Watch";
  }

  const name = WATCH_PRODUCT_TYPE_TO_NAME[productType];
  if (!name) {
    return productType;
  }

  return `${name} (${productType})`;
}
