export interface MagnetDesign {
  id: string;
  name: string;
  imageUrl: string; // Base64 or URL
  textOverlay?: string;
  textColor?: string; // Hex or tailwind
  fontSize?: number;
  fontFamily?: string;
  effect?: 'none' | 'bw' | 'sepia' | 'vintage' | 'warm' | 'cool' | 'glow';
  borderStyle?: 'none' | 'thin-white' | 'polaroid' | 'pastel-pink-frame' | 'scalloped' | 'shadow-inset';
  quantity: number;
  sizeCm: number; // e.g. 7.5 cm (approx 3 inches)
  cropZoom?: number; // 100 to 300
  cropX?: number; // offset in px or %
  cropY?: number; // offset in px or %
}

export interface QuoteRequest {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  additionalNotes?: string;
  designs: MagnetDesign[];
  totalPriceEstimate: number;
  status: 'pending' | 'submitted' | 'confirmed';
}
