export type AuthenticationCredentials = {
    email: string;
    password: string;
};

export type RegistrationCredentials = {
    displayName: string;
    email: string;
    password: string;
};

export type User = {
    displayName: string;
    email: string;
    id: string;
    imageUrl?: string;
    token: string;
};
