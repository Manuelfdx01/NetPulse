/** @odoo-module **/

import { Component, onWillStart, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";

import { api } from "./api_client";
import { createInitialIncidentState, resolveIncidentListState } from "./presentation_state";

export class NetpulseIncidentClient extends Component {
    static template = "netpulse.NetpulseIncidentClient";

    setup() {
        this.state = useState(createInitialIncidentState());

        onWillStart(() => this.loadIncidentsIfAuthenticated());
    }

    get incidentListState() {
        return resolveIncidentListState(this.state);
    }

    async loadIncidentsIfAuthenticated() {
        if (!api.accessToken || !api.currentUser) {
            return;
        }
        this.state.user = api.currentUser;
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
            this.state.notice = "El estado de la incidencia se actualizó.";
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
