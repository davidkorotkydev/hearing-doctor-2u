import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { tap } from "rxjs";

import { AuthenticationCredentials, RegistrationCredentials, User } from "@/types/user";

@Injectable({
    providedIn: "root",
})
export class AccountService {
    currentUser = signal<User | null>(null);
    private baseUrl = "https://localhost:10443/api/";
    private http = inject(HttpClient);

    authenticate(credentials: AuthenticationCredentials) {
        return this.http.post<User>(this.baseUrl + "account/authenticate", credentials).pipe(
            tap((user) => {
                if (user) this.setCurrentUser(user);
            }),
        );
    }

    deauthenticate() {
        localStorage.removeItem("user");
        this.currentUser.set(null);
    }

    register(credentials: RegistrationCredentials) {
        return this.http.post<User>(this.baseUrl + "account/register", credentials).pipe(
            tap((user) => {
                if (user) this.setCurrentUser(user);
            }),
        );
    }

    setCurrentUser(user: User) {
        localStorage.setItem("user", JSON.stringify(user));
        this.currentUser.set(user);
    }
}
