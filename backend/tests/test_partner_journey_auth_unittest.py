import unittest

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from auth import create_access_token
from routers import partner_journey


class _FakeUsers:
    def __init__(self, docs):
        self.docs = docs

    async def find_one(self, query, projection=None):
        return self.docs.get(query.get("id"))


class _FakeDb:
    def __init__(self, users):
        self.users = _FakeUsers(users)


def _credentials(user_id, email, role):
    token = create_access_token({"sub": user_id, "email": email, "role": role})
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


class PartnerJourneyAuthTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self._old_db = partner_journey.db

    def tearDown(self):
        partner_journey.db = self._old_db

    async def test_partner_auth_allows_own_partner(self):
        partner_journey.db = _FakeDb(
            {"u1": {"id": "u1", "role": "partner", "partner_id": "p1"}}
        )

        token_data = await partner_journey.require_partner_or_admin_for_partner(
            "p1", _credentials("u1", "p1@example.com", "partner")
        )

        self.assertEqual(token_data.user_id, "u1")

    async def test_partner_auth_blocks_other_partner(self):
        partner_journey.db = _FakeDb(
            {"u1": {"id": "u1", "role": "partner", "partner_id": "p1"}}
        )

        with self.assertRaises(HTTPException) as ctx:
            await partner_journey.require_partner_or_admin_for_partner(
                "p2", _credentials("u1", "p1@example.com", "partner")
            )

        self.assertEqual(ctx.exception.status_code, 403)

    async def test_partner_auth_allows_admin_for_any_partner(self):
        partner_journey.db = _FakeDb({})

        token_data = await partner_journey.require_partner_or_admin_for_partner(
            "p2", _credentials("admin1", "admin@example.com", "admin")
        )

        self.assertEqual(token_data.role, "admin")

    async def test_partner_auth_requires_token(self):
        partner_journey.db = _FakeDb({})

        with self.assertRaises(HTTPException) as ctx:
            await partner_journey.require_partner_or_admin_for_partner("p1", None)

        self.assertEqual(ctx.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
