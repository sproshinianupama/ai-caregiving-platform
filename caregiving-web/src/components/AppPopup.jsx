import { useEffect, useState } from "react";

import logo from "../assets/logo.png";

const popupStyles = {
  success: {
    title: "Success",
    accent: "from-emerald-500 to-teal-400",
    ring: "ring-emerald-100",
    mark: "OK"
  },
  error: {
    title: "Action needed",
    accent: "from-red-500 to-rose-400",
    ring: "ring-red-100",
    mark: "!"
  },
  warning: {
    title: "Please confirm",
    accent: "from-amber-500 to-orange-400",
    ring: "ring-amber-100",
    mark: "?"
  },
  info: {
    title: "Care AI",
    accent: "from-[#1A85C6] to-[#62BFE3]",
    ring: "ring-blue-100",
    mark: "i"
  }
};

function AppPopup() {
  const [popup, setPopup] = useState(null);
  const [confirmPopup, setConfirmPopup] = useState(null);

  useEffect(() => {
    const handlePopup = (event) => {
      const nextPopup = {
        id: Date.now(),
        type: event.detail.type || "info",
        title: event.detail.title,
        message: event.detail.message
      };

      setPopup(nextPopup);
      window.clearTimeout(window.__careAiPopupTimer);
      window.__careAiPopupTimer = window.setTimeout(() => {
        setPopup((currentPopup) =>
          currentPopup?.id === nextPopup.id ? null : currentPopup
        );
      }, 3600);
    };

    const handleConfirm = (event) => {
      setConfirmPopup({
        title: event.detail.title || "Please confirm",
        message: event.detail.message,
        confirmText: event.detail.confirmText || "Delete",
        cancelText: event.detail.cancelText || "Cancel",
        resolve: event.detail.resolve
      });
    };

    window.addEventListener("app-popup", handlePopup);
    window.addEventListener("app-confirm", handleConfirm);

    return () => {
      window.removeEventListener("app-popup", handlePopup);
      window.removeEventListener("app-confirm", handleConfirm);
      window.clearTimeout(window.__careAiPopupTimer);
    };
  }, []);

  const closeConfirm = (result) => {
    confirmPopup?.resolve(result);
    setConfirmPopup(null);
  };

  const popupStyle = popupStyles[popup?.type] || popupStyles.info;

  return (
    <>
      {popup && (
        <div className="fixed right-5 top-5 z-[100] w-[min(92vw,390px)]">
          <div className={`overflow-hidden rounded-xl bg-white shadow-2xl ring-4 ${popupStyle.ring}`}>
            <div className={`h-2 bg-gradient-to-r ${popupStyle.accent}`} />
            <div className="flex gap-4 p-4">
              <div className="relative h-14 w-14 shrink-0 rounded-full bg-blue-50 p-2 shadow-inner">
                <img src={logo} alt="Care AI" className="h-full w-full object-contain" />
                <span className={`absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r ${popupStyle.accent} text-[10px] font-bold text-white`}>
                  {popupStyle.mark}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-[#2F2F2F]">
                  {popup.title || popupStyle.title}
                </h3>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  {popup.message}
                </p>
              </div>
              <button
                onClick={() => setPopup(null)}
                className="h-7 w-7 rounded-full bg-slate-100 text-sm font-bold text-slate-500 hover:bg-slate-200"
                aria-label="Close message"
              >
                X
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPopup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="h-2 bg-gradient-to-r from-red-500 to-orange-400" />
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-red-50 p-3 shadow-inner">
                <img src={logo} alt="Care AI" className="h-full w-full object-contain" />
              </div>
              <h3 className="text-xl font-bold text-[#2F2F2F]">
                {confirmPopup.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {confirmPopup.message}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => closeConfirm(false)}
                  className="rounded-md bg-slate-200 px-5 py-2 font-semibold text-slate-700 hover:bg-slate-300"
                >
                  {confirmPopup.cancelText}
                </button>
                <button
                  onClick={() => closeConfirm(true)}
                  className="rounded-md bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700"
                >
                  {confirmPopup.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AppPopup;
