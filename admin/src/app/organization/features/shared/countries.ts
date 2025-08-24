export interface Country {
  name: string;
  code: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { name: "Egypt", code: "+20", flag: "🇪🇬" },
  { name: "United States", code: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "France", code: "+33", flag: "🇫🇷" },
  { name: "Italy", code: "+39", flag: "🇮🇹" },
  { name: "Spain", code: "+34", flag: "🇪🇸" },
  { name: "Netherlands", code: "+31", flag: "🇳🇱" },
  { name: "Belgium", code: "+32", flag: "🇧🇪" },
  { name: "Switzerland", code: "+41", flag: "🇨🇭" },
  { name: "Austria", code: "+43", flag: "🇦🇹" },
  { name: "Sweden", code: "+46", flag: "🇸🇪" },
  { name: "Norway", code: "+47", flag: "🇳🇴" },
  { name: "Denmark", code: "+45", flag: "🇩🇰" },
  { name: "Finland", code: "+358", flag: "🇫🇮" },
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "China", code: "+86", flag: "🇨🇳" },
  { name: "Japan", code: "+81", flag: "🇯🇵" },
  { name: "South Korea", code: "+82", flag: "🇰🇷" },
  { name: "Singapore", code: "+65", flag: "🇸🇬" },
  { name: "Malaysia", code: "+60", flag: "🇲🇾" },
  { name: "Thailand", code: "+66", flag: "🇹🇭" },
  { name: "Philippines", code: "+63", flag: "🇵🇭" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "Vietnam", code: "+84", flag: "🇻🇳" },
  { name: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
  { name: "UAE", code: "+971", flag: "🇦🇪" },
  { name: "Kuwait", code: "+965", flag: "🇰🇼" },
  { name: "Qatar", code: "+974", flag: "🇶🇦" },
  { name: "Bahrain", code: "+973", flag: "🇧🇭" },
  { name: "Oman", code: "+968", flag: "🇴🇲" },
  { name: "Jordan", code: "+962", flag: "🇯🇴" },
  { name: "Lebanon", code: "+961", flag: "🇱🇧" },
  { name: "Turkey", code: "+90", flag: "🇹🇷" },
  { name: "Israel", code: "+972", flag: "🇮🇱" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "Nigeria", code: "+234", flag: "🇳🇬" },
  { name: "Kenya", code: "+254", flag: "🇰🇪" },
  { name: "Morocco", code: "+212", flag: "🇲🇦" },
  { name: "Tunisia", code: "+216", flag: "🇹🇳" },
  { name: "Algeria", code: "+213", flag: "🇩🇿" },
  { name: "Brazil", code: "+55", flag: "🇧🇷" },
  { name: "Mexico", code: "+52", flag: "🇲🇽" },
  { name: "Argentina", code: "+54", flag: "🇦🇷" },
  { name: "Chile", code: "+56", flag: "🇨🇱" },
  { name: "Colombia", code: "+57", flag: "🇨🇴" },
  { name: "Peru", code: "+51", flag: "🇵🇪" },
  { name: "Russia", code: "+7", flag: "🇷🇺" },
  { name: "Ukraine", code: "+380", flag: "🇺🇦" },
  { name: "Poland", code: "+48", flag: "🇵🇱" },
  { name: "Czech Republic", code: "+420", flag: "🇨🇿" },
  { name: "Hungary", code: "+36", flag: "🇭🇺" },
  { name: "Romania", code: "+40", flag: "🇷🇴" },
  { name: "Bulgaria", code: "+359", flag: "🇧🇬" },
  { name: "Greece", code: "+30", flag: "🇬🇷" },
  { name: "Cyprus", code: "+357", flag: "🇨🇾" },
  { name: "Portugal", code: "+351", flag: "🇵🇹" },
  { name: "Ireland", code: "+353", flag: "🇮🇪" },
  { name: "Iceland", code: "+354", flag: "🇮🇸" },
  { name: "Luxembourg", code: "+352", flag: "🇱🇺" },
  { name: "Malta", code: "+356", flag: "🇲🇹" },
  { name: "New Zealand", code: "+64", flag: "🇳🇿" },
];

export const getCountryByName = (name: string): Country | undefined => {
  return COUNTRIES.find((country) => country.name === name);
};

export const getCountryByCode = (code: string): Country | undefined => {
  return COUNTRIES.find((country) => country.code === code);
};

export const getDefaultCountry = (): Country => {
  return COUNTRIES[0]; // Egypt as default
};
