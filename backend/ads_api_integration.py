# ads_api_integration.py
"""
Real-time API Integration for Meta Ads Manager & LinkedIn Campaign Manager
Includes Smart-Optimization alerts based on CPL thresholds
"""

import os
import httpx
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class AdsMetrics:
    """Unified metrics structure for Meta and LinkedIn"""
    impressions: int = 0
    clicks: int = 0
    spend: float = 0.0
    leads: int = 0
    conversions: int = 0
    revenue: float = 0.0
    ctr: float = 0.0
    cpc: float = 0.0
    cpl: float = 0.0
    roas: float = 0.0
    
    def calculate_derived_metrics(self):
        """Calculate CTR, CPC, CPL, ROAS from raw data"""
        if self.impressions > 0:
            self.ctr = (self.clicks / self.impressions) * 100
        if self.clicks > 0 and self.spend > 0:
            self.cpc = self.spend / self.clicks
        if self.leads > 0 and self.spend > 0:
            self.cpl = self.spend / self.leads
        if self.spend > 0 and self.revenue > 0:
            self.roas = self.revenue / self.spend
        return self

# =============================================================================
# META ADS API CLIENT
# =============================================================================

class MetaAdsClient:
    """
    Client for Meta Ads Manager API (Facebook Marketing API)
    Requires: App ID, App Secret, Access Token, Ad Account ID
    """
    
    BASE_URL = "https://graph.facebook.com/v18.0"
    
    def __init__(self, access_token: str, ad_account_id: str):
        self.access_token = access_token
        self.ad_account_id = ad_account_id
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def get_campaigns(self) -> List[Dict]:
        """Fetch all campaigns for the ad account"""
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/{self.ad_account_id}/campaigns",
                params={
                    "access_token": self.access_token,
                    "fields": "id,name,status,created_time,objective"
                }
            )
            response.raise_for_status()
            return response.json().get("data", [])
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def get_campaign_insights(
        self,
        campaign_id: str,
        date_start: str,
        date_stop: str
    ) -> Dict:
        """
        Fetch campaign insights/metrics
        date_start/date_stop format: YYYY-MM-DD
        """
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/{campaign_id}/insights",
                params={
                    "access_token": self.access_token,
                    "fields": "impressions,clicks,spend,ctr,cpc,actions,action_values,conversions,purchase_roas",
                    "time_range": f'{{"since":"{date_start}","until":"{date_stop}"}}'
                }
            )
            response.raise_for_status()
            data = response.json().get("data", [{}])[0]
            
            # Parse metrics
            metrics = AdsMetrics(
                impressions=int(data.get("impressions", 0)),
                clicks=int(data.get("clicks", 0)),
                spend=float(data.get("spend", 0)),
                ctr=float(data.get("ctr", 0)),
                cpc=float(data.get("cpc", 0))
            )
            
            # Extract leads from actions
            for action in data.get("actions", []):
                if action.get("action_type") == "lead":
                    metrics.leads = int(action.get("value", 0))
                elif action.get("action_type") == "purchase":
                    metrics.conversions = int(action.get("value", 0))
            
            # Extract revenue from action_values
            for av in data.get("action_values", []):
                if av.get("action_type") == "purchase":
                    metrics.revenue = float(av.get("value", 0))
            
            metrics.calculate_derived_metrics()
            return metrics.__dict__
    
    async def get_account_insights_aggregated(self, days_back: int = 7) -> Dict:
        """Get aggregated insights for the entire ad account"""
        end_date = datetime.now(timezone.utc).date()
        start_date = end_date - timedelta(days=days_back)
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/{self.ad_account_id}/insights",
                params={
                    "access_token": self.access_token,
                    "fields": "impressions,clicks,spend,ctr,cpc,actions,action_values",
                    "time_range": f'{{"since":"{start_date.isoformat()}","until":"{end_date.isoformat()}"}}'
                }
            )
            response.raise_for_status()
            return response.json()

# =============================================================================
# LINKEDIN CAMPAIGN MANAGER API CLIENT
# =============================================================================

class LinkedInAdsClient:
    """
    Client for LinkedIn Campaign Manager API
    Requires: Access Token, Ad Account URN
    """
    
    BASE_URL = "https://api.linkedin.com/rest"
    API_VERSION = "202411"
    
    def __init__(self, access_token: str, ad_account_urn: str):
        self.access_token = access_token
        self.ad_account_urn = ad_account_urn
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "LinkedIn-Version": self.API_VERSION,
            "Content-Type": "application/json"
        }
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def get_campaigns(self) -> List[Dict]:
        """Fetch all campaigns for the ad account"""
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/adAccounts/{self.ad_account_urn}/adCampaigns",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json().get("elements", [])
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def get_campaign_analytics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """Fetch campaign analytics for date range"""
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/adAnalytics",
                headers=self.headers,
                params={
                    "q": "analytics",
                    "dateRange.start.day": start_date.day,
                    "dateRange.start.month": start_date.month,
                    "dateRange.start.year": start_date.year,
                    "dateRange.end.day": end_date.day,
                    "dateRange.end.month": end_date.month,
                    "dateRange.end.year": end_date.year,
                    "accounts": self.ad_account_urn,
                    "fields": "impressions,clicks,costInLocalCurrency,externalWebsiteConversions,oneClickLeads",
                    "pivots": "CAMPAIGN"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # Aggregate metrics from all campaigns
            total_metrics = AdsMetrics()
            for element in data.get("elements", []):
                metrics = element.get("metrics", {})
                total_metrics.impressions += int(metrics.get("impressions", 0))
                total_metrics.clicks += int(metrics.get("clicks", 0))
                total_metrics.spend += float(metrics.get("costInLocalCurrency", 0))
                total_metrics.leads += int(metrics.get("oneClickLeads", 0))
                total_metrics.conversions += int(metrics.get("externalWebsiteConversions", 0))
            
            total_metrics.calculate_derived_metrics()
            return total_metrics.__dict__
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def get_lead_form_responses(self, form_id: str, limit: int = 100) -> List[Dict]:
        """Fetch lead form submission responses"""
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/leadFormResponses",
                headers=self.headers,
                params={
                    "q": "criteria",
                    "ids": form_id
                }
            )
            response.raise_for_status()
            return response.json().get("elements", [])

# =============================================================================
# SMART OPTIMIZATION SERVICE
# =============================================================================

class SmartOptimizationService:
    """
    Smart-Optimization logic for STEFANIA
    Monitors CPL thresholds and triggers alerts
    """
    
    def __init__(self, db):
        self.db = db
    
    async def check_cpl_threshold(
        self,
        partner_id: str,
        platform: str,
        current_cpl: float,
        cpl_threshold: float
    ) -> Optional[Dict]:
        """
        Check if CPL exceeds the partner's Business Plan threshold
        Returns alert dict if threshold exceeded
        """
        if current_cpl <= 0 or cpl_threshold <= 0:
            return None
        
        if current_cpl > cpl_threshold:
            severity = "critical" if current_cpl > cpl_threshold * 1.5 else "warning"
            
            alert = {
                "id": str(uuid.uuid4()) if 'uuid' in dir() else f"alert_{datetime.now().timestamp()}",
                "partner_id": partner_id,
                "platform": platform,
                "alert_type": "cpl_exceeded",
                "severity": severity,
                "current_value": current_cpl,
                "threshold_value": cpl_threshold,
                "message": f"CPL {platform.upper()} di €{current_cpl:.2f} supera la soglia di €{cpl_threshold:.2f} definita nel Business Plan",
                "suggested_action": self._get_optimization_suggestion(platform, severity),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "resolved": False
            }
            
            # Store alert
            await self.db.performance_alerts.insert_one(alert)
            
            return alert
        
        return None
    
    def _get_optimization_suggestion(self, platform: str, severity: str) -> str:
        """Generate optimization suggestion based on platform and severity"""
        if platform == "meta":
            if severity == "critical":
                return "AZIONE URGENTE: Pausa le campagne con CPL > soglia. Testa nuovi hook dalla Hook Gallery. Considera shift budget a LinkedIn."
            return "Rivedi il targeting. Testa creatività alternative. Considera pubblico lookalike più ristretto."
        
        elif platform == "linkedin":
            if severity == "critical":
                return "AZIONE URGENTE: Verifica targeting ABM. I lead sono qualificati? Considera riduzione bid o pausa temporanea."
            return "Ottimizza il targeting per seniority. Testa Thought Leadership ads. Verifica qualità lead form."
        
        return "Analizza le performance e ottimizza di conseguenza."
    
    async def calculate_roi_with_crm_data(
        self,
        partner_id: str,
        platform: str,
        spend: float,
        crm_revenue: float
    ) -> Dict:
        """
        Calculate real ROI using CRM sales data (MARTA integration)
        """
        if spend <= 0:
            return {"roi": 0, "roas": 0, "profit": 0}
        
        profit = crm_revenue - spend
        roi = (profit / spend) * 100 if spend > 0 else 0
        roas = crm_revenue / spend if spend > 0 else 0
        
        return {
            "partner_id": partner_id,
            "platform": platform,
            "spend": spend,
            "crm_revenue": crm_revenue,
            "profit": profit,
            "roi": roi,
            "roas": roas,
            "calculated_at": datetime.now(timezone.utc).isoformat()
        }

# =============================================================================
# MARTA INTEGRATION (CRM Data for ROI Calculation)
# =============================================================================

class MartaCRMBridge:
    """
    Bridge to MARTA module for CRM data synchronization
    Used to calculate real ROI based on actual sales
    """
    
    def __init__(self, db):
        self.db = db
    
    async def get_partner_sales(self, partner_id: str, date_start: datetime, date_end: datetime) -> Dict:
        """
        Get sales data from CRM for ROI calculation
        """
        # Query CRM sales data (simulated structure)
        sales = await self.db.crm_sales.find({
            "partner_id": partner_id,
            "sale_date": {
                "$gte": date_start,
                "$lte": date_end
            }
        }).to_list(1000)
        
        total_revenue = sum(s.get("amount", 0) for s in sales)
        total_sales = len(sales)
        
        # Attribution by UTM source
        by_source = {}
        for sale in sales:
            source = sale.get("utm_source", "direct")
            if source not in by_source:
                by_source[source] = {"revenue": 0, "count": 0}
            by_source[source]["revenue"] += sale.get("amount", 0)
            by_source[source]["count"] += 1
        
        return {
            "partner_id": partner_id,
            "total_revenue": total_revenue,
            "total_sales": total_sales,
            "by_source": by_source,
            "date_range": {
                "start": date_start.isoformat(),
                "end": date_end.isoformat()
            }
        }
    
    async def record_sale(
        self,
        partner_id: str,
        amount: float,
        utm_source: str = None,
        utm_campaign: str = None,
        customer_email: str = None
    ) -> Dict:
        """Record a sale in the CRM (for ROI attribution)"""
        sale_doc = {
            "id": f"sale_{datetime.now().timestamp()}",
            "partner_id": partner_id,
            "amount": amount,
            "utm_source": utm_source,
            "utm_campaign": utm_campaign,
            "customer_email": customer_email,
            "sale_date": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.crm_sales.insert_one(sale_doc)
        return sale_doc

# =============================================================================
# UNIFIED ADS SERVICE
# =============================================================================

class UnifiedAdsService:
    """
    Unified service for managing both Meta and LinkedIn ads
    Handles real API calls when credentials are available,
    falls back to simulation otherwise
    """
    
    def __init__(self, db):
        self.db = db
        self.smart_optimizer = SmartOptimizationService(db)
        self.marta_bridge = MartaCRMBridge(db)
    
    async def get_partner_api_credentials(self, partner_id: str) -> Dict:
        """Get stored API credentials for a partner"""
        creds = await self.db.partner_api_credentials.find_one(
            {"partner_id": partner_id},
            {"_id": 0}
        )
        return creds or {}
    
    async def store_partner_api_credentials(
        self,
        partner_id: str,
        meta_access_token: str = None,
        meta_ad_account_id: str = None,
        linkedin_access_token: str = None,
        linkedin_ad_account_urn: str = None
    ):
        """Store API credentials for a partner"""
        creds = {
            "partner_id": partner_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if meta_access_token:
            creds["meta_access_token"] = meta_access_token
        if meta_ad_account_id:
            creds["meta_ad_account_id"] = meta_ad_account_id
        if linkedin_access_token:
            creds["linkedin_access_token"] = linkedin_access_token
        if linkedin_ad_account_urn:
            creds["linkedin_ad_account_urn"] = linkedin_ad_account_urn
        
        await self.db.partner_api_credentials.update_one(
            {"partner_id": partner_id},
            {"$set": creds},
            upsert=True
        )
        
        return {"success": True}
    
    async def fetch_real_metrics(
        self,
        partner_id: str,
        platform: str,
        days_back: int = 7
    ) -> Optional[Dict]:
        """
        Fetch real metrics from Meta or LinkedIn API
        Returns None if credentials not available
        """
        creds = await self.get_partner_api_credentials(partner_id)
        
        if platform == "meta":
            if not creds.get("meta_access_token") or not creds.get("meta_ad_account_id"):
                logger.info(f"No Meta credentials for partner {partner_id}")
                return None
            
            try:
                client = MetaAdsClient(
                    creds["meta_access_token"],
                    creds["meta_ad_account_id"]
                )
                
                end_date = datetime.now(timezone.utc).date()
                start_date = end_date - timedelta(days=days_back)
                
                # Get account-level insights
                insights = await client.get_account_insights_aggregated(days_back)
                return insights
                
            except Exception as e:
                logger.error(f"Meta API error for partner {partner_id}: {e}")
                return None
        
        elif platform == "linkedin":
            if not creds.get("linkedin_access_token") or not creds.get("linkedin_ad_account_urn"):
                logger.info(f"No LinkedIn credentials for partner {partner_id}")
                return None
            
            try:
                client = LinkedInAdsClient(
                    creds["linkedin_access_token"],
                    creds["linkedin_ad_account_urn"]
                )
                
                end_date = datetime.now(timezone.utc)
                start_date = end_date - timedelta(days=days_back)
                
                analytics = await client.get_campaign_analytics(start_date, end_date)
                return analytics
                
            except Exception as e:
                logger.error(f"LinkedIn API error for partner {partner_id}: {e}")
                return None
        
        return None
    
    async def sync_and_check_alerts(
        self,
        partner_id: str,
        cpl_threshold_meta: float = 15.0,
        cpl_threshold_linkedin: float = 25.0
    ) -> Dict:
        """
        Sync metrics from APIs and check CPL thresholds
        Triggers Smart-Optimization alerts if needed
        """
        alerts = []
        metrics = {"meta": None, "linkedin": None}
        
        # Try to fetch real metrics
        for platform in ["meta", "linkedin"]:
            real_metrics = await self.fetch_real_metrics(partner_id, platform)
            
            if real_metrics:
                metrics[platform] = real_metrics
                
                # Get CPL and check threshold
                cpl = real_metrics.get("cpl", 0)
                threshold = cpl_threshold_meta if platform == "meta" else cpl_threshold_linkedin
                
                alert = await self.smart_optimizer.check_cpl_threshold(
                    partner_id, platform, cpl, threshold
                )
                if alert:
                    alerts.append(alert)
            else:
                # Use simulated/stored data
                campaign = await self.db.ads_campaigns.find_one(
                    {"partner_id": partner_id, "platform": platform},
                    {"_id": 0}
                )
                if campaign:
                    metrics[platform] = campaign
                    cpl = campaign.get("cpl", 0)
                    threshold = cpl_threshold_meta if platform == "meta" else cpl_threshold_linkedin
                    
                    alert = await self.smart_optimizer.check_cpl_threshold(
                        partner_id, platform, cpl, threshold
                    )
                    if alert:
                        alerts.append(alert)
        
        return {
            "partner_id": partner_id,
            "metrics": metrics,
            "alerts_triggered": len(alerts),
            "alerts": alerts,
            "synced_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def calculate_partner_roi(self, partner_id: str, days_back: int = 30) -> Dict:
        """
        Calculate real ROI for a partner using CRM data from MARTA
        """
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days_back)
        
        # Get CRM sales data
        sales_data = await self.marta_bridge.get_partner_sales(partner_id, start_date, end_date)
        
        # Get ads spend data
        meta_campaign = await self.db.ads_campaigns.find_one(
            {"partner_id": partner_id, "platform": "meta"},
            {"_id": 0}
        )
        linkedin_campaign = await self.db.ads_campaigns.find_one(
            {"partner_id": partner_id, "platform": "linkedin"},
            {"_id": 0}
        )
        
        total_spend = 0
        if meta_campaign:
            total_spend += meta_campaign.get("spend_total", 0)
        if linkedin_campaign:
            total_spend += linkedin_campaign.get("spend_total", 0)
        
        # Calculate ROI
        roi_data = await self.smart_optimizer.calculate_roi_with_crm_data(
            partner_id,
            "combined",
            total_spend,
            sales_data["total_revenue"]
        )
        
        return {
            **roi_data,
            "sales_data": sales_data,
            "spend_breakdown": {
                "meta": meta_campaign.get("spend_total", 0) if meta_campaign else 0,
                "linkedin": linkedin_campaign.get("spend_total", 0) if linkedin_campaign else 0
            }
        }

# Export classes
__all__ = [
    "MetaAdsClient",
    "LinkedInAdsClient", 
    "SmartOptimizationService",
    "MartaCRMBridge",
    "UnifiedAdsService",
    "AdsMetrics"
]
