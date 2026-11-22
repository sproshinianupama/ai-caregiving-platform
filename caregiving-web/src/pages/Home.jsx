import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FindCaregiver from "./FindCaregiver";
import BecomeCaregiver from "./BecomeCaregiver";
import Login from "./Login";
import { useLanguage } from "../lib/language";

import family1 from "../assets/family1.jpg";
import family2 from "../assets/family2.jpg";
import family3 from "../assets/family3.jpg";
import family4 from "../assets/family4.jpg";

function Home() {
  const [showFindCaregiver, setShowFindCaregiver] = useState(false);
  const [showBecomeCaregiver, setShowBecomeCaregiver] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const { t } = useLanguage();
  const images = [family1, family2, family3, family4];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="flex flex-col bg-gradient-to-r from-blue-100 to-blue-100 text-[#2F2F2F]">
      <Navbar
        onFindCaregiver={() => setShowFindCaregiver(true)}
        onBecomeCaregiver={() => setShowBecomeCaregiver(true)}
        onLogin={() => setShowLogin(true)}
      />

      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          openFindCaregiver={() => {
            setShowLogin(false);
            setShowFindCaregiver(true);
          }}
          openBecomeCaregiver={() => {
            setShowLogin(false);
            setShowBecomeCaregiver(true);
          }}
        />
      )}

      {showFindCaregiver && (
        <FindCaregiver
          onClose={() => setShowFindCaregiver(false)}
          openLogin={() => setShowLogin(true)}
        />
      )}

      {showBecomeCaregiver && (
        <BecomeCaregiver
          onClose={() => setShowBecomeCaregiver(false)}
          openLogin={() => setShowLogin(true)}
        />
      )}

      <section className="bg-gradient-to-r from-blue-100 to-blue-100 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col md:flex-row justify-between gap-10 items-center">
          <div className="md:w-1/2 space-y-4 sm:space-y-14 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold italic leading-[1.3] bg-gradient-to-r from-[#2F2F2F] via-[#1A85C6] to-[#6D9043] bg-clip-text text-transparent">
              <span className="block">{t("aiPowered")}</span>
              <span className="block mt-3">{t("caregivingForEvery")}</span>
              <span className="block mt-3">{t("sriLankanFamily")}</span>
            </h1>

            <p className="text-2xl sm:text-3xl md:text-3xl bg-gradient-to-r from-[#2F2F2F] to-[#1A85C6] bg-clip-text text-transparent">
              {t("heroDescription")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center">
              <button
                onClick={() => setShowFindCaregiver(true)}
                className="bg-gradient-to-r from-[#1A85C6] to-[#62BFE3] px-6 py-3 rounded-md font-medium text-center text-white"
              >
                {t("findCaregiver")} <br />({t("registerNow")})
              </button>

              <button
                onClick={() => setShowBecomeCaregiver(true)}
                className="bg-gradient-to-r from-[#1A85C6] to-[#62BFE3] px-6 py-3 rounded-md font-medium text-center text-white"
              >
                {t("becomeCaregiver")} <br />({t("registerNow")})
              </button>
            </div>
          </div>

          <div className="md:w-1/2 flex flex-col gap-2 items-center sm:items-start">
            {images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`Family ${index + 1}`}
                className={`w-36 sm:w-44 md:w-52 rounded-md shadow-md ml-0
                  ${index === 1 ? "sm:ml-20" : ""}
                  ${index === 2 ? "sm:ml-60" : ""}
                  ${index === 3 ? "sm:ml-80" : ""}
                  ${activeIndex === index ? "animate-rotate360" : ""}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 bg-gradient-to-r from-[#1A85C6] to-[#62BFE3] rounded-md font-medium text-center text-black">
        <div className="bg-white rounded-lg p-6 shadow text-center">
          <h3 className="font-bold mb-2">{t("onDemandMatching")}</h3>
          <p className="text-sm">{t("onDemandMatchingDesc")}</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow text-center">
          <h3 className="font-bold mb-2">{t("emergencyDispatch")}</h3>
          <p className="text-sm">{t("emergencyDispatchDesc")}</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow text-center">
          <h3 className="font-bold mb-2">{t("predictiveRequests")}</h3>
          <p className="text-sm">{t("predictiveRequestsDesc")}</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow text-center">
          <h3 className="font-bold mb-2">{t("trustAndSafety")}</h3>
          <p className="text-sm">{t("trustAndSafetyDesc")}</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Home;
