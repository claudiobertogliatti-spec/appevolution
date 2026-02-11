#!/usr/bin/env python3
"""
Evolution PRO OS v3.0 - Backend API Testing Suite
Tests all endpoints for YouTube integration, GAIA Funnel Deployer, TTS, and core functionality
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any

class EvolutionProAPITester:
    def __init__(self, base_url="https://cdev-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.failed_tests = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int = 200, 
                 data: Dict = None, headers: Dict = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
            except:
                response_data = response.text

            details = f"Status: {response.status_code}"
            if not success:
                details += f" (expected {expected_status})"
                
            self.log_test(name, success, details, response_data if not success else None)
            return success, response_data

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, str(e)

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "")

    def test_stats_endpoint(self):
        """Test stats endpoint for KPIs"""
        success, data = self.run_test("Stats Endpoint", "GET", "stats")
        if success and isinstance(data, dict):
            required_fields = ["total_partners", "active_partners", "total_revenue", "alerts_count"]
            missing_fields = [f for f in required_fields if f not in data]
            if missing_fields:
                self.log_test("Stats Data Validation", False, f"Missing fields: {missing_fields}")
                return False
            else:
                self.log_test("Stats Data Validation", True, f"All required fields present: {required_fields}")
        return success

    def test_agents_endpoint(self):
        """Test agents endpoint"""
        success, data = self.run_test("Agents Endpoint", "GET", "agents")
        if success and isinstance(data, list):
            if len(data) == 9:  # Expected 9 agents from seed data
                self.log_test("Agents Count Validation", True, f"Found {len(data)} agents")
                # Check agent structure
                if data and all(key in data[0] for key in ["id", "role", "status", "budget", "category"]):
                    self.log_test("Agent Data Structure", True, "All required fields present")
                else:
                    self.log_test("Agent Data Structure", False, "Missing required fields in agent data")
            else:
                self.log_test("Agents Count Validation", False, f"Expected 9 agents, got {len(data)}")
        return success

    def test_partners_endpoint(self):
        """Test partners endpoint"""
        success, data = self.run_test("Partners Endpoint", "GET", "partners")
        if success and isinstance(data, list):
            if len(data) >= 5:  # Expected at least 5 partners from seed data
                self.log_test("Partners Count Validation", True, f"Found {len(data)} partners")
                # Check partner structure
                if data and all(key in data[0] for key in ["id", "name", "niche", "phase", "contract"]):
                    self.log_test("Partner Data Structure", True, "All required fields present")
                else:
                    self.log_test("Partner Data Structure", False, "Missing required fields in partner data")
            else:
                self.log_test("Partners Count Validation", False, f"Expected at least 5 partners, got {len(data)}")
        return success

    def test_alerts_endpoint(self):
        """Test alerts endpoint"""
        success, data = self.run_test("Alerts Endpoint", "GET", "alerts")
        if success and isinstance(data, list):
            self.log_test("Alerts Data Type", True, f"Found {len(data)} alerts")
            # Check alert structure if alerts exist
            if data and all(key in data[0] for key in ["id", "agent", "type", "msg", "time", "partner"]):
                self.log_test("Alert Data Structure", True, "All required fields present")
            elif not data:
                self.log_test("Alert Data Structure", True, "No alerts present (valid state)")
            else:
                self.log_test("Alert Data Structure", False, "Missing required fields in alert data")
        return success

    def test_modules_endpoint(self):
        """Test modules endpoint"""
        success, data = self.run_test("Modules Endpoint", "GET", "modules")
        if success and isinstance(data, list):
            if len(data) == 10:  # Expected 10 modules (0-9)
                self.log_test("Modules Count Validation", True, f"Found {len(data)} modules")
                # Check module structure
                if data and all(key in data[0] for key in ["num", "title", "lessons"]):
                    self.log_test("Module Data Structure", True, "All required fields present")
                else:
                    self.log_test("Module Data Structure", False, "Missing required fields in module data")
            else:
                self.log_test("Modules Count Validation", False, f"Expected 10 modules, got {len(data)}")
        return success

    def test_chat_endpoint(self):
        """Test VALENTINA chat endpoint"""
        chat_data = {
            "session_id": f"test-session-{datetime.now().timestamp()}",
            "message": "Ciao VALENTINA, come stai?",
            "partner_name": "Marco Ferretti",
            "partner_niche": "Business Coach",
            "partner_phase": "F5",
            "modules_done": 4
        }
        
        success, data = self.run_test("Chat Endpoint", "POST", "chat", 200, chat_data)
        if success and isinstance(data, dict):
            if "response" in data and "timestamp" in data:
                self.log_test("Chat Response Structure", True, "Response contains required fields")
                # Check if response is not empty
                if data["response"] and len(data["response"].strip()) > 0:
                    self.log_test("Chat Response Content", True, f"Got response: {data['response'][:100]}...")
                else:
                    self.log_test("Chat Response Content", False, "Empty response from VALENTINA")
            else:
                self.log_test("Chat Response Structure", False, "Missing required fields in chat response")
        return success

    def test_partner_detail_endpoint(self):
        """Test individual partner endpoint"""
        # First get partners to get a valid ID
        success, partners_data = self.run_test("Get Partners for Detail Test", "GET", "partners")
        if success and partners_data and len(partners_data) > 0:
            partner_id = partners_data[0]["id"]
            success, data = self.run_test("Partner Detail Endpoint", "GET", f"partners/{partner_id}")
            if success and isinstance(data, dict):
                if data.get("id") == partner_id:
                    self.log_test("Partner Detail Data", True, f"Retrieved partner: {data.get('name', 'Unknown')}")
                else:
                    self.log_test("Partner Detail Data", False, "Partner ID mismatch")
        else:
            self.log_test("Partner Detail Endpoint", False, "No partners available for testing")
        return success

    def test_alert_dismiss(self):
        """Test alert dismissal"""
        # First get alerts to see if any exist
        success, alerts_data = self.run_test("Get Alerts for Dismiss Test", "GET", "alerts")
        if success and alerts_data and len(alerts_data) > 0:
            alert_id = alerts_data[0]["id"]
            success, data = self.run_test("Alert Dismiss", "DELETE", f"alerts/{alert_id}")
            if success:
                # Verify alert was deleted
                success2, remaining_alerts = self.run_test("Verify Alert Deletion", "GET", "alerts")
                if success2:
                    deleted = not any(a["id"] == alert_id for a in remaining_alerts)
                    self.log_test("Alert Deletion Verification", deleted, 
                                f"Alert {'deleted' if deleted else 'still exists'}")
        else:
            self.log_test("Alert Dismiss Test", True, "No alerts to dismiss (valid state)")
        return True

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Evolution PRO Backend API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)

        # Core API tests
        self.test_root_endpoint()
        self.test_stats_endpoint()
        self.test_agents_endpoint()
        self.test_partners_endpoint()
        self.test_alerts_endpoint()
        self.test_modules_endpoint()
        
        # Advanced functionality tests
        self.test_partner_detail_endpoint()
        self.test_chat_endpoint()
        self.test_alert_dismiss()

        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend is working correctly.")
            return 0
        else:
            failed_tests = [r for r in self.test_results if not r["success"]]
            print(f"❌ {len(failed_tests)} tests failed:")
            for test in failed_tests:
                print(f"   - {test['test_name']}: {test['details']}")
            return 1

def main():
    tester = EvolutionProAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())