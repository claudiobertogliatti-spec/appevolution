import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import axios from "axios";
import { API } from "../../utils/api-config";

import { AnalisiStrategicaLanding } from "./AnalisiStrategicaLanding";
import { AnalisiRegistrazione } from "./AnalisiRegistrazione";
import { AnalisiQuestionario } from "./AnalisiQuestionario";
import { ClienteDashboard } from "./ClienteDashboard";

// Stripe promise - will be initialized with key from backend
let stripePromise = null;

const STEPS = {
  LANDING: "landing",
  REGISTER: "register",
  QUESTIONNAIRE: "questionnaire",
  PAYMENT: "payment",
  DASHBOARD: "dashboard"
};

export function AnalisiStrategicaApp() {
  const [step, setStep] = useState(STEPS.LANDING);
  const [userData, setUserData] = useState(null);
  const [questionnaireData, setQuestionnaireData] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const savedCliente = localStorage.getItem("cliente_data");
    if (savedCliente) {
      try {
        const cliente = JSON.parse(savedCliente);
        setUserData(cliente);
        // If they've already paid, go to dashboard
        if (cliente.has_paid) {
          setStep(STEPS.DASHBOARD);
        }
      } catch (e) {
        localStorage.removeItem("cliente_data");
      }
    }
  }, []);

  // Handle starting the analysis flow
  const handleStartAnalisi = () => {
    if (userData && userData.has_paid) {
      setStep(STEPS.DASHBOARD);
    } else if (userData) {
      setStep(STEPS.QUESTIONNAIRE);
    } else {
      setStep(STEPS.REGISTER);
    }
  };

  // Handle registration complete
  const handleRegistrationComplete = (data) => {
    setUserData(data);
    localStorage.setItem("cliente_data", JSON.stringify(data));
    setStep(STEPS.QUESTIONNAIRE);
  };

  // Handle questionnaire complete - proceed to payment
  const handleQuestionnaireComplete = async (answers) => {
    setQuestionnaireData(answers);
    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      // Save questionnaire answers
      await axios.post(`${API}/clienti/${userData.id}/questionnaire`, {
        answers: answers
      });

      // Create Stripe checkout session
      const response = await axios.post(`${API}/clienti/create-checkout-session`, {
        cliente_id: userData.id,
        email: userData.email,
        nome: userData.nome,
        cognome: userData.cognome
      });

      if (response.data.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.checkout_url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentError(error.response?.data?.detail || "Errore durante il pagamento. Riprova.");
      setIsProcessingPayment(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("cliente_data");
    setUserData(null);
    setQuestionnaireData(null);
    setStep(STEPS.LANDING);
  };

  // Check for payment success on mount (redirect back from Stripe)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    const sessionId = urlParams.get("session_id");

    if (paymentStatus === "success" && sessionId) {
      // Verify payment and update user
      verifyPayment(sessionId);
    } else if (paymentStatus === "cancelled") {
      setPaymentError("Pagamento annullato. Puoi riprovare quando vuoi.");
      setStep(STEPS.QUESTIONNAIRE);
    }
  }, []);

  const verifyPayment = async (sessionId) => {
    try {
      const response = await axios.post(`${API}/clienti/verify-payment`, {
        session_id: sessionId
      });

      if (response.data.success) {
        const updatedUser = { ...userData, has_paid: true, status: "pending" };
        setUserData(updatedUser);
        localStorage.setItem("cliente_data", JSON.stringify(updatedUser));
        setStep(STEPS.DASHBOARD);
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      setPaymentError("Errore nella verifica del pagamento. Contatta il supporto.");
    }
  };

  // Render based on current step
  const renderStep = () => {
    switch (step) {
      case STEPS.LANDING:
        return <AnalisiStrategicaLanding onStartAnalisi={handleStartAnalisi} />;
      
      case STEPS.REGISTER:
        return (
          <AnalisiRegistrazione 
            onComplete={handleRegistrationComplete}
            onBack={() => setStep(STEPS.LANDING)}
          />
        );
      
      case STEPS.QUESTIONNAIRE:
        return (
          <AnalisiQuestionario 
            userData={userData}
            onComplete={handleQuestionnaireComplete}
            onBack={() => setStep(STEPS.REGISTER)}
            isProcessingPayment={isProcessingPayment}
          />
        );
      
      case STEPS.DASHBOARD:
        return (
          <ClienteDashboard 
            cliente={userData}
            onLogout={handleLogout}
          />
        );
      
      default:
        return <AnalisiStrategicaLanding onStartAnalisi={handleStartAnalisi} />;
    }
  };

  return (
    <div data-testid="analisi-strategica-app">
      {paymentError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-red-500/90 text-white text-sm font-semibold shadow-lg">
          {paymentError}
          <button 
            onClick={() => setPaymentError(null)}
            className="ml-4 opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}
      {renderStep()}
    </div>
  );
}

export default AnalisiStrategicaApp;
