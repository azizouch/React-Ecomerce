// User types
export interface User {
  id: string;
  auth_id?: string;
  nom: string;
  prenom: string;
  email?: string;
  role: string;
  statut: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  vehicule?: string;
  zone?: string;
  date_creation: string;
  date_modification?: string;
}

// Client types
export interface Client {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  created_at: string;
}

// Entreprise types
export interface Entreprise {
  id: string;
  nom: string;
  contact?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  created_at: string;
}

// Colis types
export interface Colis {
  id: string;
  client_id?: string;
  entreprise_id?: string;
  livreur_id?: string;
  statut: string;
  prix?: number;
  poids?: number;
  dimensions?: string;
  contenu?: string;
  adresse_livraison?: string;
  ville_livraison?: string;
  date_creation: string;
  date_mise_a_jour?: string;
  notes?: string;
}

// Statut types
export interface Statut {
  id: string;
  nom: string;
  type: string;
  couleur: string;
  ordre: number;
  actif: boolean;
  created_at: string;
}

// Historique Colis types
export interface HistoriqueColis {
  id: string;
  colis_id: string;
  ancien_statut: string;
  nouveau_statut: string;
  utilisateur_id: string;
  date_changement: string;
  notes?: string;
}

// Notification types
export interface Notification {
  id: string;
  utilisateur_id: string;
  titre: string;
  message: string;
  lu: boolean;
  date_creation: string;
  type?: string;
}

// Bon types
export interface Bon {
  id: string;
  user_id?: string;
  livreur_id?: string;
  type: 'distribution' | 'paiement' | 'retour';
  statut: string;
  nb_colis?: number;
  client_id?: string;
  montant?: number;
  date_creation: string;
  date_echeance?: string;
  colis_id?: string;
  motif?: string;
  notes?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: any;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  livreurId?: string;
  sortBy?: 'recent' | 'oldest' | 'status';
  dateFilter?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Dashboard stats
export interface DashboardStats {
  totalColis: number;
  enAttente: number;
  enTraitement: number;
  livres: number;
  retournes: number;
  clientsEnregistres: number;
  entreprisesPartenaires: number;
  livreursActifs: number;
}

// Global search results
export interface GlobalSearchResults {
  clients: Client[];
  colis: Colis[];
  entreprises: Entreprise[];
  livreurs: User[];
  error: any;
}

// Bon stats
export interface BonStats {
  distribution: {
    total: number;
    enCours: number;
    complete: number;
    annule: number;
  };
  paiement: {
    total: number;
    enCours: number;
    complete: number;
    annule: number;
  };
  retour: {
    total: number;
    enCours: number;
    complete: number;
    annule: number;
  };
}
