export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  student_id?: string;
  role?: string;
  profile_image_url?: string;
}
