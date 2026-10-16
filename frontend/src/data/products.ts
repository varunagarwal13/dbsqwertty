export interface Product {
  id: string;
  name: string;
  jpName: string;
  category: string;
  price: number;
  priceDisplay: string;
  badge?: string;
  subtitle: string;
  description: string;
  image: string;
  images?: string[];
  finishes: { name: string; hex: string }[];
  optionsName?: string;
  options?: string[];
  specs: { label: string; value: string }[];
  inTheBox: string[];
  isComingSoon?: boolean;
}

export const PRODUCTS: Record<string, Product> = {
  keyboard: {
    id: "keyboard",
    name: "Axis 75 Mechanical Keyboard",
    jpName: "軸",
    category: "Keyboards & Peripherals",
    price: 189,
    priceDisplay: "$189.00",
    badge: "Flagship Edition",
    subtitle: "75% CNC Aerospace Aluminum • Chamfered Brass Weight • Custom Gasket Mount",
    description: "Precision-milled from a single block of 6063 aerospace aluminum, the Axis 75 combines architectural minimalism with acoustic resonance. Hand-lubed linear switches sit upon flexible leaf-spring gaskets, accompanied by an exposed chamfered brass bottom weight tuned for a deep, muted marble sound signature.",
    image: "/images/keyboard/keyboard_1.jpg",
    images: [
      "/images/keyboard/keyboard_1.jpg",
      "/images/keyboard/keyboard_2.jpg"
    ],
    finishes: [
      { name: "Midnight Charcoal & Crimson", hex: "#1a1618" },
      { name: "Obsidian Black", hex: "#0b0507" },
      { name: "Patinated Silver", hex: "#7a7476" }
    ],
    optionsName: "Switch Type",
    options: ["Sakura Red Linear (45g)", "Nocturne Silent (52g)", "Twilight Tactile (62g)"],
    specs: [
      { label: "Layout", value: "75% Compact (82 Keys) + Precision Knurled Dial" },
      { label: "Case Material", value: "CNC-Machined 6063 Aerospace Aluminum" },
      { label: "Sound Plate & Weight", value: "Chamfered Polished Brass Plate (1,890g Total)" },
      { label: "Mounting Style", value: "Dual-Stage Leaf-Spring Silicone Gaskets" },
      { label: "Connectivity", value: "Braided Detachable USB-C / 2.4GHz / BT 5.2" },
      { label: "Keycaps", value: "Cherry Profile 1.5mm Thick Dye-Sub PBT" },
      { label: "Polling Rate", value: "1,000Hz Ultra-Low Latency" }
    ],
    inTheBox: [
      "Axis 75 Mechanical Keyboard",
      "Braided USB-C to USB-A Cable (Crimson/Charcoal)",
      "Brass Switch & Keycap Puller",
      "Extra Accent Keycap Set (Sakura Red Enter & Esc)",
      "2.4GHz Wireless USB Dongle"
    ]
  },
  mouse: {
    id: "mouse",
    name: "Arc Wireless Ergonomic Mouse",
    jpName: "鼠",
    category: "Peripherals & Input",
    price: 89,
    priceDisplay: "$89.00",
    badge: "New Release",
    subtitle: "Ultra-Lightweight Magnesium Unibody • Crimson PTFE Skates • 8K Polling",
    description: "Designed for frictionless fluidity. The Arc features an exoskeleton sculpted from magnesium alloy, paired with zero-friction crimson PTFE ceramic skates and silent optical switches rated for 90 million clicks.",
    image: "/images/mouse/mouse_4.jpg",
    images: [
      "/images/mouse/mouse_1.jpg",
      "/images/mouse/mouse_2.jpg",
      "/images/mouse/mouse_3.jpg",
      "/images/mouse/mouse_4.jpg",
      "/images/mouse/mouse_5.jpg"
    ],
    finishes: [
      { name: "Midnight Magnesium", hex: "#1f1c20" },
      { name: "Crimson Blossom Accent", hex: "#7A1F2E" },
      { name: "Bone White", hex: "#e5dede" }
    ],
    optionsName: "Sensor Configuration",
    options: ["PixArt PAW3395 (26,000 DPI)", "PAW3950 Ultra Esports (30,000 DPI +$15)"],
    specs: [
      { label: "Total Weight", value: "49 grams (Featherweight Unibody)" },
      { label: "Sensor", value: "PixArt Optical Sensor with 8,000Hz Polling" },
      { label: "Switches", value: "Gen-3 Optical Silent Switches (90M Clicks)" },
      { label: "Battery Life", value: "Up to 95 Hours continuous play" },
      { label: "Skates", value: "100% Virgin Grade Crimson PTFE Ceramic" },
      { label: "Connectivity", value: "Tri-mode: USB-C, 2.4GHz Wireless, Bluetooth" }
    ],
    inTheBox: [
      "Arc Wireless Ergonomic Mouse",
      "Paracord USB-C Fast-Charging Cable",
      "Wireless 8K Polling Dongle",
      "Replacement Crimson PTFE Skates",
      "Textured Grip Tape Set"
    ]
  },
  lamp: {
    id: "lamp",
    name: "Halo Architectural Table Lamp",
    jpName: "灯",
    category: "Lighting & Atmosphere",
    price: 129,
    priceDisplay: "$129.00",
    badge: "Sanctuary Lighting",
    subtitle: "Patinated Dark Bronze • Fluted Borosilicate Glass • Stepped Brass Dimmer",
    description: "A monolithic cylindrical sanctuary light designed to cast a warm, non-glare pool of 3000K illumination across desk surfaces. Features a knurled stepped solid brass dial that lets you smoothly transition from twilight ambient candle glow to sharp focus light.",
    image: "/landing-pages/secret-pathways-assets/generated/lamp.jpg",
    finishes: [
      { name: "Patinated Bronze", hex: "#3e2e28" },
      { name: "Smoked Dark Obsidian", hex: "#151012" },
      { name: "Raw Brushed Brass", hex: "#8c724b" }
    ],
    optionsName: "Light Spectrum",
    options: ["3000K Warm Architectural Amber", "2700K Candlelight Glow", "Dual-Spectrum Focus (2700K-4000K)"],
    specs: [
      { label: "Dimensions", value: "Height: 240mm (9.4 in) | Base Diameter: 90mm" },
      { label: "Chassis", value: "Cast Patinated Bronze Base & Top Cap" },
      { label: "Diffuser", value: "Ribbed Fluted Borosilicate Studio Glass" },
      { label: "CRI Rating", value: "CRI > 97 Ultra-High Color Fidelity" },
      { label: "Dimmer Dial", value: "Solid Knurled Brass Analog Potentiometer" },
      { label: "Power", value: "USB-C Direct Powered with 6-Hour Emergency Cell" }
    ],
    inTheBox: [
      "Halo Architectural Table Lamp",
      "Braided Fabric USB-C Power Cable (2.0m)",
      "Weighted Desktop Cable Guide in Bronze",
      "Microfiber Optical Glass Cleaning Cloth"
    ]
  },
  dac: {
    id: "dac",
    name: "Link USB-C Audio Hub & DAC",
    jpName: "予告",
    category: "Audio Hardware & Expansion",
    price: 169,
    priceDisplay: "$169.00",
    badge: "Coming Soon // Late 2026",
    subtitle: "Solid Billet Aluminum • ESS Sabre 32-bit DAC • 100W Power Delivery Hub",
    description: "A monolithic centerpiece uniting studio-grade audio amplification with high-speed desk expansion. Encased in a single CNC-milled block of black anodized aluminum with an illuminated crimson rotary dial, the Link eliminates desk clutter while driving audiophile headphones.",
    image: "/landing-pages/secret-pathways-assets/generated/dac.jpg",
    isComingSoon: true,
    finishes: [
      { name: "Anodized Obsidian", hex: "#120b0e" },
      { name: "Crimson Anodized Dial", hex: "#7A1F2E" }
    ],
    optionsName: "Edition",
    options: ["Priority Reserve (First Batch)", "Studio Edition with XLR Out"],
    specs: [
      { label: "DAC Chipset", value: "ESS Sabre ES9038Q2M (32-bit / 768kHz, DSD512)" },
      { label: "Headphone Amp", value: "1,200mW @ 32Ω Balanced 4.4mm + 3.5mm" },
      { label: "Expansion Hub", value: "3x USB-C 3.2 Gen2 (10Gbps), 1x HDMI 2.1 4K120" },
      { label: "Power Delivery", value: "100W GaN Passthrough Charging" },
      { label: "Enclosure", value: "Single-Piece Billet Aluminum with Crimson Backlight" }
    ],
    inTheBox: [
      "Link USB-C Audio Hub & DAC",
      "100W Ultra-Flexible Braided USB-C Cable",
      "6.35mm to 3.5mm Gold-Plated Audio Adapter",
      "Certificate of Authenticity & Reserve Badge"
    ]
  },
  macropad: {
    id: "macropad",
    name: "Kage Macro Pad & Dial Controller",
    jpName: "予告",
    category: "Artisan Controllers",
    price: 79,
    priceDisplay: "$79.00",
    badge: "Coming Soon // Late 2026",
    subtitle: "9-Key Programmable Artisan Controller • CNC Dial • VIA/QMK Support",
    description: "A dedicated 9-key tactile command pad finished in matching obsidian and crimson sakura aesthetics. Fully customizable per app for audio scrubbing, timeline navigation, macro shortcuts, and brush controls.",
    image: "/landing-pages/secret-pathways-assets/generated/keyboard.jpg",
    isComingSoon: true,
    finishes: [
      { name: "Midnight Obsidian", hex: "#140e11" },
      { name: "Crimson Sakura Edition", hex: "#7A1F2E" }
    ],
    optionsName: "Knob Material",
    options: ["Chamfered Brass Knob", "Crimson Aluminum Knob"],
    specs: [
      { label: "Layout", value: "9 Hot-swappable Mechanical Sockets (Cherry MX compatible)" },
      { label: "Encoder", value: "Bourns High-Resolution Stepped Rotary Knob with Push-Click" },
      { label: "Firmware", value: "QMK / VIA / VIAL Web Configurable Out of Box" },
      { label: "Case", value: "Cast Dark Alloy with Integrated Non-Slip Silicone Base" }
    ],
    inTheBox: [
      "Kage 9-Key Macro Pad",
      "Braided USB-C Cable",
      "Switch Puller Tool",
      "Reserve Serial Card"
    ]
  }
};
