export interface GenerateRequestBody {
  dirname: string;
  username: string;
  email: string;
  wpPassword: string;
  mysqlRootPassword: string;
  mysqlUser: string;
  mysqlPassword: string;
  mysqlPort: number;
  wpPort: number;
  nameApiKey: string;
  rules: string;
}