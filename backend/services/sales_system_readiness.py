"""Controlli puri sulle evidenze reali del sistema di vendita F-13."""
from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class ReadinessCheck:
    id: str
    ok: bool
    label: str


@dataclass(frozen=True)
class ReadinessReport:
    ready: bool
    checks: list[ReadinessCheck]

    def to_dict(self) -> dict[str, Any]:
        return {"ready": self.ready, "checks": [asdict(check) for check in self.checks]}


def evaluate_sales_system(ctx: dict[str, Any]) -> ReadinessReport:
    checks = [
        ReadinessCheck("subaccount", bool(ctx.get("subaccount")), "Subaccount Systeme collegato"),
        ReadinessCheck("domain", bool(ctx.get("domain")), "Dominio o sottodominio configurato"),
        ReadinessCheck("legal", bool(ctx.get("legal")), "Pagine legali presenti"),
        ReadinessCheck("funnel", bool(ctx.get("funnel")), "Funnel pubblicato"),
        ReadinessCheck("checkout", bool(ctx.get("checkout")), "Checkout raggiungibile"),
        ReadinessCheck("price", bool(ctx.get("price")), "Prezzo configurato"),
        ReadinessCheck("automation", bool(ctx.get("automation")), "Automazioni di accesso configurate"),
    ]
    return ReadinessReport(all(check.ok for check in checks), checks)


def evaluate_launch_readiness(ctx: dict[str, Any]) -> ReadinessReport:
    checks = [
        ReadinessCheck("masterclass", bool(ctx.get("masterclass")), "Masterclass approvata"),
        ReadinessCheck("lessons", bool(ctx.get("lessons")), "Videolezioni approvate"),
        ReadinessCheck("sales_system", bool(ctx.get("sales_system")), "Sistema di vendita verificato"),
        ReadinessCheck("calendar", bool(ctx.get("calendar")), "Calendario di lancio approvato"),
        ReadinessCheck("price_webinar", bool(ctx.get("price_webinar")), "Prezzo e webinar approvati"),
        ReadinessCheck("launch_date", bool(ctx.get("launch_date")), "Data di lancio fissata"),
    ]
    return ReadinessReport(all(check.ok for check in checks), checks)
