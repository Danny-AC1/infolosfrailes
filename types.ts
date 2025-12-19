
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
}

export interface Ally {
  id: string;
  name: string;
  type: 'hospedaje' | 'restaurante';
  description: string;
  image: string;
  address?: string;
}

export interface Feedback {
  name: string;
  comment: string;
  timestamp: any;
}
