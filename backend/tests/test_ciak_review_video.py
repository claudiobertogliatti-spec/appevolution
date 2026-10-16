import os

import pytest
from jose import jwt

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")

from services import ciak_review_video as crv

pytestmark = pytest.mark.unit
SECRET, ALG = "test-secret", "HS256"


def test_token_is_valid_only_for_its_own_partner_and_lesson():
    t = crv.make_token(jwt, SECRET, ALG, "p1", "lez-2")
    assert crv.verify_token(jwt, SECRET, ALG, t, "p1", "lez-2")
    assert not crv.verify_token(jwt, SECRET, ALG, t, "p1", "lez-3")      # altra lezione
    assert not crv.verify_token(jwt, SECRET, ALG, t, "p2", "lez-2")      # altro partner
    assert not crv.verify_token(jwt, "altro-segreto", ALG, t, "p1", "lez-2")
    assert not crv.verify_token(jwt, SECRET, ALG, "", "p1", "lez-2")


def test_expired_token_is_refused():
    t = crv.make_token(jwt, SECRET, ALG, "p1", "lez-2", ttl_s=60, now=1_000_000)       # scaduto nel 1970
    assert not crv.verify_token(jwt, SECRET, ALG, t, "p1", "lez-2")


def test_a_login_style_token_cannot_be_used_and_ours_cannot_log_in():
    login = jwt.encode({"sub": "u1", "role": "admin", "exp": 4_000_000_000}, SECRET, algorithm=ALG)
    assert not crv.verify_token(jwt, SECRET, ALG, login, "p1", "lez-2")               # niente purpose/pid/lid
    ours = jwt.decode(crv.make_token(jwt, SECRET, ALG, "p1", "lez-2"), SECRET, algorithms=[ALG])
    assert "sub" not in ours                                                           # decode_token lo rifiuta


@pytest.mark.parametrize("header,size,expected", [
    ("bytes=0-", 1000, (0, 999)),
    ("bytes=100-199", 1000, (100, 199)),
    ("bytes=900-5000", 1000, (900, 999)),
    ("bytes=-100", 1000, (900, 999)),
    (None, 1000, (0, 999)),
    ("bytes=0-", 50_000_000, (0, crv.MAX_CHUNK - 1)),                                   # a pezzi, non tutto
    ("bytes=1000-2000", 1000, None),                                                    # oltre la fine -> 416
    ("bytes=5-1", 1000, None), ("bytes=abc", 1000, None), ("items=0-1", 1000, None),
    ("bytes=0-1,5-9", 1000, None), ("bytes=0-", 0, None), ("bytes=-0", 1000, None),
])
def test_range_parsing(header, size, expected):
    assert crv.parse_range(header, size) == expected


def test_gs_url_split():
    assert crv.split_gs_url("gs://b/raw_videos/p/lez-2/x.mp4") == ("b", "raw_videos/p/lez-2/x.mp4")
    assert crv.split_gs_url("https://drive.google.com/x") is None and crv.split_gs_url("gs://solo-bucket") is None
    assert crv.split_gs_url("") is None
