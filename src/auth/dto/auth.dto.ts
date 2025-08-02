export class AuthDto {
  email: string;
  password: string;
  userMetadata?: {
    firstName: string;
    lastName: string;
    agreedToTerms: boolean;
    completedOnboarding: boolean;
    companyName: string;
    companyString: string;
  };
}
