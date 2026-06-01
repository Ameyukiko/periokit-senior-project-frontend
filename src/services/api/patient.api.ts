

// Mock Types
export interface Patient {
  id: string;
  hn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO String
  gender: "Male" | "Female" | "Other";
  lastVisitDate: string | null;
}

export interface PatientListResponse {
  patients: Patient[];
  totalCount: number;
}

// Mock Data
let MOCK_PATIENTS: Patient[] = [
  { id: "p1", hn: "HN0001", firstName: "Somchai", lastName: "Jaidee", dateOfBirth: "1980-05-15", gender: "Male", lastVisitDate: "2023-10-01T10:00:00Z" },
  { id: "p2", hn: "HN0002", firstName: "Somsri", lastName: "Rakdee", dateOfBirth: "1992-08-20", gender: "Female", lastVisitDate: "2023-10-15T14:30:00Z" },
  { id: "p3", hn: "HN0003", firstName: "Mana", lastName: "Manee", dateOfBirth: "1975-12-10", gender: "Male", lastVisitDate: null },
  { id: "p4", hn: "HN0004", firstName: "Wichai", lastName: "Suksawat", dateOfBirth: "1988-02-28", gender: "Male", lastVisitDate: "2023-11-05T09:15:00Z" },
  { id: "p5", hn: "HN0005", firstName: "Pornpan", lastName: "Wongsuwan", dateOfBirth: "2000-01-05", gender: "Female", lastVisitDate: "2023-11-10T11:00:00Z" },
];

export const patientApi = {
  // Fetch patients with pagination, search, filter
  async getPatients(
    page: number = 1,
    limit: number = 10,
    search: string = "",
    sortsStr: string = "{}",
    startDate: string = "",
    endDate: string = "",
    gender: string = "",
    minAge: number | null = null,
    maxAge: number | null = null
  ): Promise<PatientListResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    let filtered = MOCK_PATIENTS;

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.firstName.toLowerCase().includes(lowerSearch) ||
          p.lastName.toLowerCase().includes(lowerSearch) ||
          p.hn.toLowerCase().includes(lowerSearch)
      );
    }

    if (gender) {
      filtered = filtered.filter(p => p.gender === gender);
    }

    if (minAge !== null || maxAge !== null) {
      filtered = filtered.filter(p => {
        const birthDate = new Date(p.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        let isValid = true;
        if (minAge !== null) isValid = isValid && age >= minAge;
        if (maxAge !== null) isValid = isValid && age <= maxAge;
        return isValid;
      });
    }

    if (startDate || endDate) {
      filtered = filtered.filter((p) => {
        if (!p.lastVisitDate) return false;
        const visitDate = new Date(p.lastVisitDate).getTime();
        
        let isValid = true;
        if (startDate) {
          isValid = isValid && visitDate >= new Date(startDate).getTime();
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setDate(end.getDate() + 1);
          isValid = isValid && visitDate < end.getTime();
        }
        return isValid;
      });
    }

    let sorts = { date: 'date_desc', age: null, name: null };
    try {
      sorts = JSON.parse(sortsStr);
    } catch(e) {}

    // Apply Multi-level Sorting (Date > Age > Name)
    filtered.sort((a, b) => {
      // 1. Date Priority
      if (sorts.date) {
        const dateA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
        const dateB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
        const dateCmp = sorts.date === "date_asc" ? dateA - dateB : dateB - dateA;
        if (dateCmp !== 0) return dateCmp;
      } else {
        // Fallback default date sort if nothing else is specified
        if (!sorts.age && !sorts.name) {
          const dateA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
          const dateB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
          const dateCmp = dateB - dateA;
          if (dateCmp !== 0) return dateCmp;
        }
      }

      // 2. Age Priority
      if (sorts.age) {
        const ageA = new Date(a.dateOfBirth).getTime();
        const ageB = new Date(b.dateOfBirth).getTime();
        const ageCmp = sorts.age === "age_asc" ? ageB - ageA : ageA - ageB; // Youngest is largest birth date
        if (ageCmp !== 0) return ageCmp;
      }

      // 3. Name Priority
      if (sorts.name) {
        const nameCmp = sorts.name === "name_asc" 
          ? a.firstName.localeCompare(b.firstName) 
          : b.firstName.localeCompare(a.firstName);
        if (nameCmp !== 0) return nameCmp;
      }

      return 0;
    });

    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      patients: paginated,
      totalCount: filtered.length,
    };
  },

  // Create a new patient
  async createPatient(data: Omit<Patient, "id" | "lastVisitDate">): Promise<Patient> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const newPatient: Patient = {
      ...data,
      id: `p${MOCK_PATIENTS.length + 1}`,
      lastVisitDate: null, // No visits yet
    };
    
    MOCK_PATIENTS = [newPatient, ...MOCK_PATIENTS]; // Add to beginning
    return newPatient;
  }
};
