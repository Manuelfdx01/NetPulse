/** @odoo-module **/

import { Component, onWillStart, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";

let accessToken = null;

class NetpulseApiClient {
    constructor() {
        this.baseUrl = "/api/v1";
    }

    async request(path, options = {}) {
        const headers = new Headers(options.headers || {});
        headers.set("Accept", "application/json");

        if (options.body) {
            headers.set("Content-Type", "application/json");
        }
        if (accessToken) {
            headers.set("Authorization", `Bearer ${accessToken}`);
        }

        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers,
        });
        const payload = await response.json().catch(() => ({}));

        if (response.status === 401) {
            accessToken = null;
            const error = new Error("Tu sesión expiró. Inicia sesión nuevamente.");
            error.status = 401;
            throw error;
        }
        if (response.status === 403) {
            const error = new Error("No tienes permisos para realizar esta acción.");
            error.status = 403;
            throw error;
        }
        if (!response.ok) {
            const error = new Error(payload.message || "No fue posible completar la solicitud.");
            error.status = response.status;
            throw error;
        }
        return payload;
    }

    async login(login, password) {
        const payload = await this.request("/auth/login", {
            method: "POST",
            body: JSON.stringify({ login, password }),
        });
        accessToken = payload.access_token;
        return payload.user;
    }

    listIncidents() {
        return this.request("/incidents");
    }

    getIncident(id) {
        return this.request(`/incidents/${id}`);
    }

    createIncident(values) {
        return this.request("/incidents", {
            method: "POST",
            body: JSON.stringify(values),
        });
    }

    updateState(id, state) {
        return this.request(`/incidents/${id}/state`, {
            method: "PATCH",
            body: JSON.stringify({ state }),
        });
    }

    logout() {
        accessToken = null;
    }
}

const api = new NetpulseApiClient();

export class NetpulseIncidentClient extends Component {
    static template = "netpulse.NetpulseIncidentClient";

    setup() {
        this.state = useState({
            login: "",
            password: "",
            user: null,
            incidents: [],
            selectedIncident: null,
            deviceId: "",
            description: "",
            rootCause: "",
            loading: false,
            submitting: false,
            error: "",
            notice: "",
            showCreateForm: false,
        });

        onWillStart(() => this.loadIncidentsIfAuthenticated());
    }

    async loadIncidentsIfAuthenticated() {
        if (!accessToken) {
            return;
        }
        await this.loadIncidents();
    }

    async login() {
        this.state.loading = true;
        this.state.error = "";
        try {
            this.state.user = await api.login(
                this.state.login,
                this.state.password
            );
            this.state.password = "";
            await this.loadIncidents();
        } catch (error) {
            this.state.error = error.message;
        } finally {
            this.state.loading = false;
        }
    }

    async loadIncidents() {
        this.state.loading = true;
        this.state.error = "";
        try {
            const result = await api.listIncidents();
            this.state.incidents = result.items || [];
            this.state.selectedIncident = null;
        } catch (error) {
            this.state.error = error.message;
            if (error.status === 401) {
                this.state.user = null;
            }
        } finally {
            this.state.loading = false;
        }
    }

    async selectIncident(incident) {
        this.state.error = "";
        this.state.notice = "";
        this.state.loading = true;
        try {
            this.state.selectedIncident = await api.getIncident(incident.id);
        } catch (error) {
            this.state.error = error.message;
            if (error.status === 401) {
                this.state.user = null;
            }
        } finally {
            this.state.loading = false;
        }
    }

    async createIncident() {
        this.state.submitting = true;
        this.state.error = "";
        this.state.notice = "";
        try {
            await api.createIncident({
                device_id: Number(this.state.deviceId),
                description: this.state.description,
                root_cause: this.state.rootCause,
            });
            this.state.deviceId = "";
            this.state.description = "";
            this.state.rootCause = "";
            this.state.showCreateForm = false;
            this.state.notice = "La incidencia se creó correctamente.";
            await this.loadIncidents();
        } catch (error) {
            this.state.error = error.message;
            if (error.status === 401) {
                this.state.user = null;
            }
        } finally {
            this.state.submitting = false;
        }
    }

    async changeState(nextState) {
        if (!this.state.selectedIncident) {
            return;
        }
        this.state.submitting = true;
        this.state.error = "";
        this.state.notice = "";
        try {
            await api.updateState(this.state.selectedIncident.id, nextState);
            this.state.notice = "El estado de la incidencia se actualizó.";
            const incidentId = this.state.selectedIncident.id;
            await this.loadIncidents();
            await this.selectIncident({ id: incidentId });
        } catch (error) {
            this.state.error = error.message;
            if (error.status === 401) {
                this.state.user = null;
            }
        } finally {
            this.state.submitting = false;
        }
    }

    logout() {
        api.logout();
        this.state.user = null;
        this.state.incidents = [];
        this.state.selectedIncident = null;
        this.state.notice = "";
        this.state.error = "";
    }
}

registry.category("actions").add(
    "netpulse_incident_client",
    NetpulseIncidentClient
);
