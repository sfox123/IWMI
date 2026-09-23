// Sector catalogue — edit this file to add/remove sectors or data items.
// Each item's `id` is stable and is used in stored records and file paths,
// so rename labels freely but avoid changing ids once data has been collected.

export type DataItem = { id: string; label: string; hint?: string };
export type ItemGroup = { id: string; label: string; items: DataItem[] };
export type Sector = {
  id: string;
  label: string;
  description: string;
  icon: string; // emoji keeps the bundle dependency-free
  groups: ItemGroup[]; // a sector with sub-sectors has several groups (e.g. Agriculture)
  hasSubsectors?: boolean;
};

export const SECTORS: Sector[] = [
  {
    id: "climate",
    label: "Climate & Meteorology",
    description: "Weather observations, climate records, forecasts and projections",
    icon: "🌦️",
    groups: [
      {
        id: "climate-obs",
        label: "Observations",
        items: [
          { id: "rainfall", label: "Rainfall / precipitation", hint: "mm" },
          { id: "temperature", label: "Temperature (max / min / mean)", hint: "°C" },
          { id: "evaporation", label: "Evaporation / evapotranspiration", hint: "mm" },
          { id: "humidity", label: "Relative humidity", hint: "%" },
          { id: "wind", label: "Wind speed and direction", hint: "m/s" },
          { id: "radiation", label: "Sunshine hours / solar radiation", hint: "h, W/m²" },
          { id: "station-network", label: "Weather station network", hint: "locations, metadata" },
        ],
      },
      {
        id: "climate-outlook",
        label: "Forecasts, extremes and projections",
        items: [
          { id: "forecasts", label: "Weather forecasts and seasonal outlooks" },
          { id: "enso", label: "ENSO / climate bulletins" },
          { id: "extremes", label: "Extreme event records", hint: "heavy rain, heatwaves, cold spells" },
          { id: "projections", label: "Climate change projections", hint: "downscaled scenarios" },
        ],
      },
    ],
  },
  {
    id: "hydrology",
    label: "Hydrology",
    description: "Rivers, streamflow, groundwater and catchments",
    icon: "🌊",
    groups: [
      {
        id: "hydro-surface",
        label: "Surface water",
        items: [
          { id: "river-level", label: "River water levels", hint: "gauging stations, m" },
          { id: "river-discharge", label: "River flow / discharge", hint: "m³/s" },
          { id: "rating-curves", label: "Rating curves" },
          { id: "flood-thresholds", label: "Flood warning thresholds", hint: "alert / minor / major levels" },
          { id: "sediment", label: "Sediment load" },
        ],
      },
      {
        id: "hydro-ground",
        label: "Groundwater and catchments",
        items: [
          { id: "gw-level", label: "Groundwater levels", hint: "wells, boreholes" },
          { id: "gw-recharge", label: "Groundwater recharge / aquifer maps" },
          { id: "basins", label: "Catchment / river basin boundaries" },
          { id: "stream-network", label: "Stream / drainage network" },
          { id: "soil-moisture", label: "Soil moisture" },
        ],
      },
    ],
  },
  {
    id: "water-resources",
    label: "Water Resources",
    description: "Water bodies, storage, allocation, quality and supply",
    icon: "💧",
    groups: [
      {
        id: "wr-bodies",
        label: "Water bodies",
        items: [
          { id: "wb-inventory", label: "Inventory of water bodies", hint: "reservoirs, lakes, ponds: name, location" },
          { id: "wetlands", label: "Wetlands, lagoons and estuaries", hint: "location, extent" },
          { id: "wb-extent", label: "Water body surface area / extent", hint: "ha or km²" },
          { id: "wb-condition", label: "Condition / rehabilitation status", hint: "reservoirs, canals" },
        ],
      },
      {
        id: "wr-storage",
        label: "Storage and levels",
        items: [
          { id: "res-capacity", label: "Reservoir capacity", hint: "full supply level, MCM" },
          { id: "res-level", label: "Reservoir water levels", hint: "m" },
          { id: "res-volume", label: "Stored water volume", hint: "MCM, % of capacity" },
          { id: "res-flows", label: "Inflows, outflows and spills", hint: "m³/s or MCM" },
        ],
      },
      {
        id: "wr-use",
        label: "Use, supply and quality",
        items: [
          { id: "irrigation-releases", label: "Irrigation water releases / allocation", hint: "by scheme or canal" },
          { id: "irrigation-schemes", label: "Irrigation schemes and command areas" },
          { id: "water-supply", label: "Drinking water supply schemes and coverage" },
          { id: "water-demand", label: "Water demand / withdrawals by sector", hint: "domestic, agriculture, industry" },
          { id: "sw-quality", label: "Surface water quality", hint: "pH, salinity, nutrients, pollution" },
          { id: "gw-quality", label: "Groundwater / drinking water quality", hint: "fluoride, nitrate, arsenic" },
        ],
      },
    ],
  },
  {
    id: "energy",
    label: "Hydropower & Energy",
    description: "Hydropower plants, generation and water used for energy",
    icon: "⚡",
    groups: [
      {
        id: "energy-hydro",
        label: "Hydropower",
        items: [
          { id: "hp-plants", label: "Hydropower plant inventory", hint: "location, installed capacity MW" },
          { id: "hp-generation", label: "Hydropower generation", hint: "GWh" },
          { id: "hp-releases", label: "Water released for power generation", hint: "MCM" },
          { id: "hp-reservoir", label: "Hydropower reservoir levels and storage" },
          { id: "small-hydro", label: "Small / mini hydro plants" },
        ],
      },
      {
        id: "energy-system",
        label: "Energy system",
        items: [
          { id: "energy-mix", label: "Electricity generation by source", hint: "hydro, thermal, solar, wind" },
          { id: "energy-demand", label: "Electricity demand / consumption" },
          { id: "renewables", label: "Solar and wind installations" },
        ],
      },
    ],
  },
  {
    id: "agriculture",
    label: "Agriculture",
    description: "Crops, horticulture, plantations and livestock",
    icon: "🌾",
    hasSubsectors: true,
    groups: [
      {
        id: "crop",
        label: "Crop",
        items: [
          { id: "crop-area", label: "Cultivated area by crop and season", hint: "ha" },
          { id: "crop-production", label: "Crop production and yield", hint: "t, t/ha" },
          { id: "crop-calendar", label: "Cropping calendar" },
          { id: "crop-damage", label: "Crop damage and losses", hint: "ha, value" },
          { id: "irrigated-area", label: "Irrigated vs rainfed area" },
          { id: "lulc", label: "Land use / land cover maps" },
          { id: "soils", label: "Soil type / soil maps" },
        ],
      },
      {
        id: "horticulture",
        label: "Horticulture",
        items: [
          { id: "hort-area", label: "Fruit and vegetable cultivated area", hint: "ha" },
          { id: "hort-production", label: "Fruit and vegetable production", hint: "t" },
          { id: "hort-prices", label: "Market prices" },
        ],
      },
      {
        id: "plantation",
        label: "Plantation",
        items: [
          { id: "plant-area", label: "Plantation crop extent", hint: "e.g. tea, rubber, coconut, oil palm" },
          { id: "plant-production", label: "Plantation production and yield" },
          { id: "plant-estates", label: "Estate / plantation locations" },
        ],
      },
      {
        id: "livestock",
        label: "Livestock",
        items: [
          { id: "ls-population", label: "Livestock population", hint: "cattle, buffalo, goats, poultry…" },
          { id: "ls-production", label: "Milk, meat and egg production" },
          { id: "ls-water", label: "Livestock water points / water use" },
          { id: "ls-grazing", label: "Grazing / pasture lands" },
          { id: "ls-losses", label: "Livestock losses from disasters or disease" },
        ],
      },
    ],
  },
  {
    id: "disaster",
    label: "Disaster",
    description: "Hazard events, impacts, risk maps and early warning",
    icon: "🚨",
    groups: [
      {
        id: "dis-events",
        label: "Events",
        items: [
          { id: "floods", label: "Flood events and inundation extent" },
          { id: "droughts", label: "Drought events and declarations" },
          { id: "landslides", label: "Landslide events" },
          { id: "storms", label: "Cyclones / storms / high winds" },
          { id: "heat", label: "Heatwave events" },
        ],
      },
      {
        id: "dis-impacts",
        label: "Impacts and response",
        items: [
          { id: "people-affected", label: "People / households affected" },
          { id: "casualties", label: "Deaths and injuries" },
          { id: "damage", label: "Damage to houses and infrastructure" },
          { id: "econ-loss", label: "Economic losses" },
          { id: "relief", label: "Relief and emergency water supply" },
          { id: "risk-maps", label: "Hazard / risk / vulnerability maps" },
          { id: "warnings", label: "Early warnings issued" },
        ],
      },
    ],
  },
  {
    id: "health",
    label: "Health",
    description: "Climate- and water-related health outcomes",
    icon: "🩺",
    groups: [
      {
        id: "health-disease",
        label: "Disease surveillance",
        items: [
          { id: "waterborne", label: "Water-borne disease cases", hint: "diarrhoea, cholera, typhoid, hepatitis A" },
          { id: "vectorborne", label: "Vector-borne disease cases", hint: "dengue, malaria" },
          { id: "leptospirosis", label: "Leptospirosis cases" },
          { id: "kidney", label: "Chronic kidney disease cases" },
          { id: "heat-illness", label: "Heat-related illness" },
          { id: "nutrition", label: "Malnutrition indicators" },
        ],
      },
      {
        id: "health-services",
        label: "Services",
        items: [
          { id: "facilities", label: "Health facility locations" },
          { id: "wash", label: "Water, sanitation and hygiene (WASH) coverage" },
          { id: "dw-testing", label: "Drinking water quality testing results" },
        ],
      },
    ],
  },
];

export const LEVELS = ["Global", "Regional", "National", "Sub-national (admin units)", "Station / point", "Gridded / raster"];
export const FREQUENCIES = ["Real-time / hourly", "Daily", "Weekly", "Monthly", "Seasonal", "Yearly", "One-time / static"];
export const FORMATS = ["Excel / CSV", "GIS vector (shapefile, GeoJSON)", "Raster (GeoTIFF)", "NetCDF", "Database / API", "PDF / report", "Paper only"];
export const ACCESS = ["Open / public", "Share on request", "Needs formal agreement", "Restricted"];

export const ALLOWED_EXTENSIONS = [
  "csv", "xlsx", "xls", "json", "geojson", "kml", "kmz", "zip", "gpkg", "tif", "tiff",
  "nc", "pdf", "docx", "doc", "txt", "shp", "dbf", "shx", "prj",
];

export function findItem(itemId: string) {
  for (const s of SECTORS) for (const g of s.groups) for (const i of g.items) if (i.id === itemId) return { sector: s, group: g, item: i };
  return null;
}
export function sectorById(id: string) {
  return SECTORS.find((s) => s.id === id);
}
