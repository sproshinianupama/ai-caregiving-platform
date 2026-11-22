import { useLanguage } from "../lib/language";

function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-700" htmlFor="language-switcher">
        {t("language")}
      </label>
      <select
        id="language-switcher"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
      >
        <option value="en">{t("english")}</option>
        <option value="si">{t("sinhala")}</option>
      </select>
    </div>
  );
}

export default LanguageSwitcher;
