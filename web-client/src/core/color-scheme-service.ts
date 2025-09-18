import { Injectable, inject, signal } from "@angular/core";
import { Meta } from "@angular/platform-browser";

import { BreakpointObserver } from "@angular/cdk/layout";

let initial_page_load = true;

@Injectable({
    providedIn: "root",
})
export class ColorSchemeService {
    actual = signal<string>("");
    private meta = inject(Meta);
    private observer = inject(BreakpointObserver);

    private goDark() {
        document.documentElement.setAttribute("data-color-scheme", "dark");
        this.meta.updateTag({ content: "#1d293d", name: "theme-color" });
        this.actual.set("dark");
    }

    private goLight() {
        document.documentElement.setAttribute("data-color-scheme", "light");
        this.meta.updateTag({ content: "#fafafa", name: "theme-color" });
        this.actual.set("light");
    }

    constructor() {
        /*
            # References #

            - [[.](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)]
            - [[.](https://material.angular.dev/cdk/layout/api#BreakpointObserver)]
        */
        this.observer.observe("(prefers-color-scheme:dark)").subscribe((value) => {
            const system = value.matches ? "dark" : "light";
            let forced = "";

            if (initial_page_load) {
                if (!("system-color-scheme" in localStorage)) {
                    /* We want a completely fresh `localStorage` to default to light mode, no matter the system setting. */
                    forced = "light";
                } else {
                    if ("forced-color-scheme" in localStorage) {
                        if (localStorage["system-color-scheme"] === system) {
                            /* If the system is the same as before, use the past setting. */
                            forced = localStorage["forced-color-scheme"];
                        } else {
                            /* Otherwise, forget the past setting. */
                            localStorage.removeItem("forced-color-scheme");
                        }
                    }
                }

                initial_page_load = false;
            } else {
                if ("forced-color-scheme" in localStorage) localStorage.removeItem("forced-color-scheme");
            }

            if (forced === "dark") {
                this.goDark();
            } else if (forced === "light") {
                this.goLight();
            } else {
                if (system === "dark") this.goDark();
                else this.goLight();
            }

            localStorage["system-color-scheme"] = system;
        });
    }

    force(scheme: string) {
        if (scheme === "dark") this.goDark();
        else this.goLight();
        localStorage["forced-color-scheme"] = scheme;
    }
}
