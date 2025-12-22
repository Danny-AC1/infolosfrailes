
export interface SiteContent {
  id: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  normativasPermitido: string[];
  normativasNoPermitido: string[];
  parqueaderoItems: string[];
  seguridadItems: string[];
  aliadosVisible: boolean;
  tiendaVisible: boolean;
  ecuadorTravelPromo: {
    title: string;
    description: string;
    image: string;
    link: string;
  };
  tiendaPromo: {
    title: string;
    description: string;
    image: string;
    link: string;
  };
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  image: string;
  price?: string;
  type: 'activity' | 'service';
  icon?: string;
  timestamp: any;
}

export interface AllyItem {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
}

export interface Ally {
  id: string;
  name: string;
  type: 'hospedaje' | 'restaurante';
  description: string;
  image: string;
  address?: string;
  whatsapp?: string;
  bankDetails?: string;
  items?: AllyItem[];
  timestamp: any;
}

export interface Feedback {
  name: string;
  comment: string;
  timestamp: any;
}

export interface Reservation {
  id: string;
  allyId: string;
  allyName: string;
  customerName: string;
  date: string;
  total: number;
  items: string[];
  status: 'pendiente' | 'confirmada';
  timestamp: any;
}
