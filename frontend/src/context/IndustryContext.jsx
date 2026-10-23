import React, { createContext, useContext, useState, useEffect } from 'react';

const INDUSTRY_PRESETS = {
  manufacturing: {
    id: 'manufacturing',
    name: 'Manufacturing & Industrial',
    badge: 'Manufacturing',
    iconName: 'Factory',
    rawMaterialLabel: 'Raw Materials & Inward Batches',
    productLabel: 'Finished Goods Catalogue',
    inwardButtonLabel: 'Inward Raw Material',
    productButtonLabel: 'Add Finished Product',
    defaultUnits: ['Kg', 'Metric Ton', 'Pieces', 'Meters', 'Liters', 'Boxes', 'Sets', 'Sq Ft'],
    categories: ['Steel & Metals', 'Coils & Sheets', 'Fasteners & Hardware', 'Chemicals', 'Finished Machinery'],
  },
  garments: {
    id: 'garments',
    name: 'Textile & Garments Manufacturing',
    badge: 'Textile & Garments',
    iconName: 'Shirt',
    rawMaterialLabel: 'Raw Fabrics, Yarns & Trims',
    productLabel: 'Apparel & Garment Catalogue',
    inwardButtonLabel: 'Inward Fabric Batch',
    productButtonLabel: 'Add Garment Item',
    defaultUnits: ['Meters', 'Rolls', 'Pieces', 'Kg', 'Bales', 'Packs', 'Sets'],
    categories: ['Cotton & Denim', 'Polyester & Silk', 'Buttons & Zippers', 'Men\'s Wear', 'Women\'s Apparel'],
  },
  pharma: {
    id: 'pharma',
    name: 'Pharma & Healthcare',
    badge: 'Pharmaceuticals',
    iconName: 'Pill',
    rawMaterialLabel: 'Raw API Compounds & Solvents',
    productLabel: 'Medicines & Formulations',
    inwardButtonLabel: 'Inward API Compound',
    productButtonLabel: 'Add Medicine / Drug',
    defaultUnits: ['Strips', 'Boxes', 'Kg', 'Grams', 'Liters', 'Bottles', 'Packs'],
    categories: ['Active Ingredients (API)', 'Excipients & Solvents', 'Tablets & Capsules', 'Syrups & Suspensions'],
  },
  retail: {
    id: 'retail',
    name: 'Retail & Wholesale Distribution',
    badge: 'Retail & Distribution',
    iconName: 'ShoppingBag',
    rawMaterialLabel: 'Bulk Wholesale Stock Inward',
    productLabel: 'Retail & Distribution Catalog',
    inwardButtonLabel: 'Inward Bulk Stock',
    productButtonLabel: 'Add Retail SKU Item',
    defaultUnits: ['Pieces', 'Boxes', 'Cartons', 'Packs', 'Units', 'Kg', 'Liters'],
    categories: ['FMCG & Groceries', 'Beverages', 'Personal Care', 'Home Goods'],
  },
  electronics: {
    id: 'electronics',
    name: 'Electronics & Hardware',
    badge: 'Electronics',
    iconName: 'Cpu',
    rawMaterialLabel: 'Components, PCB & Microchips',
    productLabel: 'Assembled Devices & Hardware',
    inwardButtonLabel: 'Inward Components',
    productButtonLabel: 'Add Electronic Device',
    defaultUnits: ['Pieces', 'Sets', 'Boxes', 'Rolls', 'Units', 'Packs'],
    categories: ['ICs & Semiconductors', 'Passives & Sensors', 'Cables & Wiring', 'Finished Electronics'],
  },
  custom: {
    id: 'custom',
    name: 'Custom Industry (100% User Tailored)',
    badge: 'Custom Enterprise',
    iconName: 'Sliders',
    rawMaterialLabel: 'Raw Inventory Inputs',
    productLabel: 'Finished Product Catalog',
    inwardButtonLabel: 'Inward Input Stock',
    productButtonLabel: 'Add Catalog Product',
    defaultUnits: ['Pieces', 'Kg', 'Metric Ton', 'Meters', 'Liters', 'Boxes', 'Packs', 'Strips', 'Rolls', 'Sets', 'Units'],
    categories: ['General Inputs', 'Sub-assemblies', 'Finished Items', 'Packaging'],
  },
};

const IndustryContext = createContext();

export const IndustryProvider = ({ children }) => {
  const [currentIndustryKey, setCurrentIndustryKey] = useState(() => {
    return localStorage.getItem('erp_industry_type') || 'manufacturing';
  });

  const [customConfig, setCustomConfig] = useState(() => {
    const saved = localStorage.getItem('erp_custom_industry_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved custom industry config:', e);
      }
    }
    return INDUSTRY_PRESETS.custom;
  });

  const selectIndustry = (key, customOverrides = null) => {
    if (key === 'custom' && customOverrides) {
      const merged = { ...INDUSTRY_PRESETS.custom, ...customOverrides };
      setCustomConfig(merged);
      localStorage.setItem('erp_custom_industry_config', JSON.stringify(merged));
    }
    setCurrentIndustryKey(key);
    localStorage.setItem('erp_industry_type', key);
  };

  const activePreset = currentIndustryKey === 'custom'
    ? { ...INDUSTRY_PRESETS.custom, ...customConfig }
    : (INDUSTRY_PRESETS[currentIndustryKey] || INDUSTRY_PRESETS.manufacturing);

  return (
    <IndustryContext.Provider
      value={{
        currentIndustryKey,
        activePreset,
        selectIndustry,
        allPresets: INDUSTRY_PRESETS,
        customConfig,
        setCustomConfig,
      }}
    >
      {children}
    </IndustryContext.Provider>
  );
};

export const useIndustry = () => {
  const context = useContext(IndustryContext);
  if (!context) {
    throw new Error('useIndustry must be used within an IndustryProvider');
  }
  return context;
};

export default IndustryContext;
