import { useLanguage } from "../lib/language";

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="w-full bg-gradient-to-r from-blue-100 to-blue-100 text-white relative">
      <div className="border-t border-black w-full mb-4"></div>
      <p className="text-center py-3 sm:py-4 md:py-5 text-xs sm:text-sm md:text-base text-black px-4">
        {t("copyright")}
      </p>
    </footer>
  );
}

export default Footer;
