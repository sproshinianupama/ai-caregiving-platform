export const showPopup = ({ message, title, type = "info" }) => {
  window.dispatchEvent(
    new CustomEvent("app-popup", {
      detail: {
        message,
        title,
        type
      }
    })
  );
};

export const showConfirm = ({ message, title, confirmText, cancelText }) =>
  new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("app-confirm", {
        detail: {
          message,
          title,
          confirmText,
          cancelText,
          resolve
        }
      })
    );
  });
