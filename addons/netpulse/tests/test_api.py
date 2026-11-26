import json

from odoo.tests.common import HttpCase, tagged


@tagged("post_install", "-at_install")
class TestNetpulseHttpApi(HttpCase):
    """Pruebas HTTP reales de los endpoints JWT y de incidencias."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        technician_group = cls.env.ref("netpulse.group_netpulse_technician")
        cls.technician = cls.env["res.users"].create({
            "name": "API Technician",
            "login": "api_technician",
            "password": "ApiPassword123!",
            "groups_id": [(6, 0, [technician_group.id])],
        })
        cls.other_technician = cls.env["res.users"].create({
            "name": "API Other Technician",
            "login": "api_other_technician",
            "password": "ApiPassword123!",
            "groups_id": [(6, 0, [technician_group.id])],
        })
        cls.device = cls.env["netpulse.device"].create({
            "name": "API-SW-01",
            "criticality": "normal",
        })

    def _login(self, login="api_technician"):
        response = self.url_open(
            "/api/v1/auth/login",
            data=json.dumps({
                "login": login,
                "password": "ApiPassword123!",
            }),
            headers={"Content-Type": "application/json"},
        )
        return response

    def _token(self):
        response = self._login()
        self.assertEqual(response.status_code, 200)
        return response.json()["access_token"]

    def _request(self, path, token=None, payload=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer %s" % token

        data = json.dumps(payload) if payload is not None else None
        return self.url_open(path, data=data, headers=headers)

    def test_login_returns_signed_bearer_token(self):
        response = self._login()

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["access_token"])
        self.assertEqual(body["token_type"], "Bearer")
        self.assertEqual(body["user"]["role"], "technician")

    def test_list_incidents_without_token_returns_401(self):
        response = self._request("/api/v1/incidents")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"], "unauthorized")

    def test_list_incidents_with_token_returns_200(self):
        response = self._request(
            "/api/v1/incidents",
            token=self._token(),
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("items", response.json())

    def test_create_incident_returns_201(self):
        response = self._request(
            "/api/v1/incidents",
            token=self._token(),
            payload={
                "device_id": self.device.id,
                "root_cause": "Prueba de integración",
                "description": "Incidencia creada por HTTP",
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["id"])

    def test_invalid_incident_payload_returns_400(self):
        response = self._request(
            "/api/v1/incidents",
            token=self._token(),
            payload={"device_id": "no-es-un-entero"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "bad_request")

    def test_forbidden_incident_detail_returns_403(self):
        incident = self.env["netpulse.incident"].create({
            "device_id": self.device.id,
            "technician_id": self.other_technician.id,
        })

        response = self._request(
            "/api/v1/incidents/%s" % incident.id,
            token=self._token(),
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"], "forbidden")

    def test_missing_incident_returns_404(self):
        response = self._request(
            "/api/v1/incidents/987654321",
            token=self._token(),
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"], "not_found")
