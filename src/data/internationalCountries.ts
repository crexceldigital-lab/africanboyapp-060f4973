export interface TerritoryRegion {
  name: string;
  code: string;
  majorCities: string[];
}

export interface InternationalCountry {
  code: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
  dialCode: string;
  flagEmoji: string;
  continent: 'Africa' | 'Europe' | 'North America' | 'Asia' | 'Middle East' | 'Other';
  regions: TerritoryRegion[];
  isPrimaryMarket?: boolean;
}

export const INTERNATIONAL_COUNTRIES: InternationalCountry[] = [
  {
    code: 'TZ',
    name: 'Tanzania',
    currencyCode: 'TZS',
    currencySymbol: 'TSh',
    dialCode: '+255',
    flagEmoji: '🇹🇿',
    continent: 'Africa',
    isPrimaryMarket: true,
    regions: [
      { name: 'Dar es Salaam & Coast', code: 'DAR', majorCities: ['Dar es Salaam', 'Kariakoo', 'Kinondoni', 'Ilala', 'Bagamoyo'] },
      { name: 'Northern Zone', code: 'NORTH', majorCities: ['Arusha', 'Moshi', 'Tanga'] },
      { name: 'Lake Zone', code: 'LAKE', majorCities: ['Mwanza', 'Bukoba', 'Musoma', 'Shinyanga'] },
      { name: 'Central Zone', code: 'CENTRAL', majorCities: ['Dodoma', 'Singida', 'Morogoro'] },
      { name: 'Southern Highlands', code: 'SOUTH', majorCities: ['Mbeya', 'Iringa', 'Songea'] },
      { name: 'Zanzibar Island', code: 'ZNZ', majorCities: ['Stone Town', 'Unguja', 'Pemba'] },
    ],
  },
  {
    code: 'KE',
    name: 'Kenya',
    currencyCode: 'KES',
    currencySymbol: 'KSh',
    dialCode: '+254',
    flagEmoji: '🇰🇪',
    continent: 'Africa',
    isPrimaryMarket: true,
    regions: [
      { name: 'Nairobi Metropolis', code: 'NBO', majorCities: ['Nairobi', 'Westlands', 'Kilimani', 'Eastleigh'] },
      { name: 'Coast Region', code: 'CST', majorCities: ['Mombasa', 'Malindi', 'Diani'] },
      { name: 'Rift Valley', code: 'RFT', majorCities: ['Nakuru', 'Eldoret', 'Naivasha'] },
      { name: 'Western & Nyanza', code: 'WST', majorCities: ['Kisumu', 'Kakamega'] },
    ],
  },
  {
    code: 'UG',
    name: 'Uganda',
    currencyCode: 'UGX',
    currencySymbol: 'USh',
    dialCode: '+256',
    flagEmoji: '🇺🇬',
    continent: 'Africa',
    isPrimaryMarket: true,
    regions: [
      { name: 'Central Kampala', code: 'KLA', majorCities: ['Kampala', 'Entebbe', 'Mukono'] },
      { name: 'Eastern Region', code: 'EST', majorCities: ['Jinja', 'Mbale'] },
      { name: 'Western Region', code: 'WST', majorCities: ['Mbarara', 'Fort Portal'] },
    ],
  },
  {
    code: 'RW',
    name: 'Rwanda',
    currencyCode: 'RWF',
    currencySymbol: 'RF',
    dialCode: '+250',
    flagEmoji: '🇷🇼',
    continent: 'Africa',
    isPrimaryMarket: true,
    regions: [
      { name: 'Kigali City', code: 'KGL', majorCities: ['Kigali', 'Nyarugenge', 'Gasabo', 'Kicukiro'] },
      { name: 'Northern Province', code: 'NTH', majorCities: ['Musanze'] },
      { name: 'Western Province', code: 'WST', majorCities: ['Rubavu', 'Gisenyi'] },
    ],
  },
  {
    code: 'BI',
    name: 'Burundi',
    currencyCode: 'BIF',
    currencySymbol: 'FBu',
    dialCode: '+257',
    flagEmoji: '🇧🇮',
    continent: 'Africa',
    regions: [
      { name: 'Bujumbura Mairie', code: 'BJM', majorCities: ['Bujumbura', 'Rohero', 'Mukaza'] },
      { name: 'Gitega Political Capital', code: 'GTG', majorCities: ['Gitega'] },
    ],
  },
  {
    code: 'CD',
    name: 'Democratic Republic of Congo',
    currencyCode: 'CDF',
    currencySymbol: 'FC',
    dialCode: '+243',
    flagEmoji: '🇨🇩',
    continent: 'Africa',
    isPrimaryMarket: true,
    regions: [
      { name: 'Kinshasa Capital', code: 'KIN', majorCities: ['Kinshasa', 'Gombe', 'Limete'] },
      { name: 'Katanga Mining Hub', code: 'KAT', majorCities: ['Lubumbashi', 'Kolwezi'] },
      { name: 'North & South Kivu', code: 'KVU', majorCities: ['Goma', 'Bukavu'] },
    ],
  },
  {
    code: 'NG',
    name: 'Nigeria',
    currencyCode: 'NGN',
    currencySymbol: '₦',
    dialCode: '+234',
    flagEmoji: '🇳🇬',
    continent: 'Africa',
    isPrimaryMarket: true,
    regions: [
      { name: 'Lagos Mega State', code: 'LOS', majorCities: ['Lagos Island', 'Lekki', 'Ikeja', 'Yaba', 'Surulere'] },
      { name: 'Federal Capital Territory', code: 'ABJ', majorCities: ['Abuja', 'Maitama', 'Wuse', 'Garki'] },
      { name: 'Rivers / South South', code: 'RIV', majorCities: ['Port Harcourt'] },
      { name: 'Oyo / South West', code: 'OYO', majorCities: ['Ibadan'] },
      { name: 'Kano / North', code: 'KAN', majorCities: ['Kano'] },
    ],
  },
  {
    code: 'GH',
    name: 'Ghana',
    currencyCode: 'GHS',
    currencySymbol: 'GH₵',
    dialCode: '+233',
    flagEmoji: '🇬🇭',
    continent: 'Africa',
    isPrimaryMarket: true,
    regions: [
      { name: 'Greater Accra', code: 'ACC', majorCities: ['Accra', 'Osu', 'East Legon', 'Tema'] },
      { name: 'Ashanti Region', code: 'ASH', majorCities: ['Kumasi'] },
      { name: 'Western Coastal', code: 'WST', majorCities: ['Takoradi', 'Cape Coast'] },
    ],
  },
  {
    code: 'ZA',
    name: 'South Africa',
    currencyCode: 'ZAR',
    currencySymbol: 'R',
    dialCode: '+27',
    flagEmoji: '🇿🇦',
    continent: 'Africa',
    isPrimaryMarket: true,
    regions: [
      { name: 'Gauteng Economic Hub', code: 'JHB', majorCities: ['Johannesburg', 'Sandton', 'Pretoria', 'Rosebank'] },
      { name: 'Western Cape', code: 'CPT', majorCities: ['Cape Town', 'Stellenbosch'] },
      { name: 'KwaZulu-Natal', code: 'DBN', majorCities: ['Durban', 'Umhlanga'] },
    ],
  },
  {
    code: 'ZM',
    name: 'Zambia',
    currencyCode: 'ZMW',
    currencySymbol: 'ZK',
    dialCode: '+260',
    flagEmoji: '🇿🇲',
    continent: 'Africa',
    regions: [
      { name: 'Lusaka Province', code: 'LSK', majorCities: ['Lusaka', 'Woodlands'] },
      { name: 'Copperbelt', code: 'CPB', majorCities: ['Kitwe', 'Ndola'] },
    ],
  },
  {
    code: 'ZW',
    name: 'Zimbabwe',
    currencyCode: 'USD',
    currencySymbol: '$',
    dialCode: '+263',
    flagEmoji: '🇿🇼',
    continent: 'Africa',
    regions: [
      { name: 'Harare Province', code: 'HRE', majorCities: ['Harare', 'Borrowdale'] },
      { name: 'Bulawayo', code: 'BUL', majorCities: ['Bulawayo'] },
    ],
  },
  {
    code: 'MZ',
    name: 'Mozambique',
    currencyCode: 'MZN',
    currencySymbol: 'MT',
    dialCode: '+258',
    flagEmoji: '🇲🇿',
    continent: 'Africa',
    regions: [
      { name: 'Maputo Cidade', code: 'MPT', majorCities: ['Maputo', 'Matola'] },
      { name: 'Beira & Central', code: 'BEI', majorCities: ['Beira'] },
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    currencyCode: 'GBP',
    currencySymbol: '£',
    dialCode: '+44',
    flagEmoji: '🇬🇧',
    continent: 'Europe',
    isPrimaryMarket: true,
    regions: [
      { name: 'Greater London', code: 'LDN', majorCities: ['Central London', 'Shoreditch', 'Brixton', 'Stratford'] },
      { name: 'Midlands', code: 'MID', majorCities: ['Birmingham', 'Leicester'] },
      { name: 'North West', code: 'NWT', majorCities: ['Manchester', 'Liverpool'] },
    ],
  },
  {
    code: 'US',
    name: 'United States',
    currencyCode: 'USD',
    currencySymbol: '$',
    dialCode: '+1',
    flagEmoji: '🇺🇸',
    continent: 'North America',
    isPrimaryMarket: true,
    regions: [
      { name: 'New York Tri-State', code: 'NY', majorCities: ['New York City', 'Brooklyn', 'Queens'] },
      { name: 'California / West Coast', code: 'CA', majorCities: ['Los Angeles', 'San Francisco', 'Oakland'] },
      { name: 'Georgia / Atlanta Hub', code: 'GA', majorCities: ['Atlanta'] },
      { name: 'Texas', code: 'TX', majorCities: ['Houston', 'Dallas'] },
      { name: 'DMV Area', code: 'DMV', majorCities: ['Washington DC', 'Silver Spring'] },
    ],
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    currencyCode: 'AED',
    currencySymbol: 'AED',
    dialCode: '+971',
    flagEmoji: '🇦🇪',
    continent: 'Middle East',
    isPrimaryMarket: true,
    regions: [
      { name: 'Dubai Emirate', code: 'DXB', majorCities: ['Dubai Downtown', 'Deira', 'Marina', 'Jumeirah'] },
      { name: 'Abu Dhabi', code: 'AUH', majorCities: ['Abu Dhabi City'] },
      { name: 'Sharjah', code: 'SHJ', majorCities: ['Sharjah'] },
    ],
  },
  {
    code: 'FR',
    name: 'France',
    currencyCode: 'EUR',
    currencySymbol: '€',
    dialCode: '+33',
    flagEmoji: '🇫🇷',
    continent: 'Europe',
    regions: [
      { name: 'Île-de-France', code: 'PAR', majorCities: ['Paris', 'Saint-Denis'] },
      { name: 'Provence-Alpes-Côte d\'Azur', code: 'PAC', majorCities: ['Marseille', 'Nice'] },
      { name: 'Auvergne-Rhône-Alpes', code: 'LYO', majorCities: ['Lyon'] },
    ],
  },
  {
    code: 'DE',
    name: 'Germany',
    currencyCode: 'EUR',
    currencySymbol: '€',
    dialCode: '+49',
    flagEmoji: '🇩🇪',
    continent: 'Europe',
    regions: [
      { name: 'Berlin Metropolis', code: 'BER', majorCities: ['Berlin'] },
      { name: 'North Rhine-Westphalia', code: 'NRW', majorCities: ['Cologne', 'Düsseldorf'] },
      { name: 'Bavaria', code: 'BAV', majorCities: ['Munich'] },
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    currencyCode: 'CAD',
    currencySymbol: 'C$',
    dialCode: '+1',
    flagEmoji: '🇨🇦',
    continent: 'North America',
    regions: [
      { name: 'Ontario', code: 'ON', majorCities: ['Toronto', 'Ottawa', 'Mississauga'] },
      { name: 'Quebec', code: 'QC', majorCities: ['Montreal'] },
      { name: 'British Columbia', code: 'BC', majorCities: ['Vancouver'] },
      { name: 'Alberta', code: 'AB', majorCities: ['Calgary', 'Edmonton'] },
    ],
  },
];

export function getCountryByCode(code: string): InternationalCountry | undefined {
  const normalized = code.trim().toUpperCase();
  return INTERNATIONAL_COUNTRIES.find(c => c.code === normalized);
}

export function getAllCountries(): InternationalCountry[] {
  return INTERNATIONAL_COUNTRIES;
}
