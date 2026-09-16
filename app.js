const { useState, useMemo, useEffect, useRef } = React;
const USD_FORMATTER = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});
function pad2(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return String(n ?? "");
    return num < 10 ? "0" + num : String(num);
}
function formatUsd(value) {
    if (value === null || value === undefined) return "";
    return USD_FORMATTER.format(value);
}
function detectMode(vehiclesRaw) {
    const first = Array.isArray(vehiclesRaw) ? vehiclesRaw[0] : null;
    if (first && (typeof first.model === "number" || "fullmodel" in first || "rarity" in first)) return "mobile";
    return "desktop";
}
function rarityStyles(rarityRaw) {
    const rarity = String(rarityRaw ?? "").toLowerCase();
    if (rarity === "rare") {
        return { color: "#de7c19a8", background: "rgba(237, 237, 58, 0.14)", border: "rgba(237, 136, 58, 0.22)" };
    }
    if (rarity === "legend") {
        return { color: "#dc2626a8", background: "rgba(220, 38, 38, 0.14)", border: "rgba(220, 38, 38, 0.22)" };
    }
    if (rarity === "unique") {
        return { color: "#2564ebbe", background: "rgba(37, 99, 235, 0.14)", border: "rgba(37, 99, 235, 0.22)" };
    }
    if (rarity === "epic") {
        return { color: "#7c3aedc2", background: "rgba(124, 58, 237, 0.14)", border: "rgba(124, 58, 237, 0.22)" };
    }
    return null;
}
function classifyVehicle(v) {
    const truck = Number(v.truck_size) || 0;
    const tank = Number(v.tank_size) || 0;
    const consumption = Number(v.consumption) || 0;
    if (truck === 0 && tank === 0 && consumption === 0) return "bicycle";
    if (truck === 0 && tank > 0 && tank <= 45) return "motorcycle";
    if (truck >= 4) return "suv";
    return "car";
}
const CLASS_LABELS = {
    car: "Cars",
    suv: "SUVs & Trucks",
    motorcycle: "Motorcycles",
    bicycle: "Bicycles",
};
const DEFAULT_FILTERS = {
    minPrice: "",
    maxPrice: "",
    vehicleClass: "all",
    minTrunk: "all",
    minTank: "all",
    maxConsumption: "all",
    sort: "default",
};
function hasActiveFilters(f) {
    return !!(
        f.minPrice ||
        f.maxPrice ||
        f.vehicleClass !== "all" ||
        f.minTrunk !== "all" ||
        f.minTank !== "all" ||
        f.maxConsumption !== "all" ||
        f.sort !== "default"
    );
}

function Highlight({ text, query }) {
    const safeText = String(text ?? "");
    if (!query) return safeText;
    const lowerText = safeText.toLowerCase();
    const lowerQuery = String(query).toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    if (index === -1) return safeText;
    const before = safeText.slice(0, index);
    const match = safeText.slice(index, index + lowerQuery.length);
    const after = safeText.slice(index + lowerQuery.length);
    return (
        <>
            {before}
            <mark>{match}</mark>
            {after}
        </>
    );
}

function Header({ mode, isDark, toggleTheme }) {
    const title = "Vehicle List";
    const primaryIsMobile = mode === "mobile";
    return (
        <header className="header">
            <div className="logo-block">
                <img src="favicon.png" alt="GRND" className="logo" />
                <div className="logo-text">
                    <h1>{title}</h1>
                </div>
            </div>
            <div className="header-right">
                <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                    {isDark ? "☀️" : "🌙"}
                </button>
                <a className={"app-btn" + (primaryIsMobile ? " app-btn--secondary" : "")} href="/">
                    Grand GTA 5
                </a>
                <a className={"app-btn" + (primaryIsMobile ? "" : " app-btn--secondary")} href="mobile">
                    Grand Mobile
                </a>
            </div>
        </header>
    );
}
function SearchBar({ value, onChange, suggestions, onSelectSuggestion, showSuggestions, onHideSuggestions, placeholder }) {
    const hasSuggestions = showSuggestions && suggestions && suggestions.length > 0;
    const suggestionsId = "vehicle-search-suggestions";
    const handleKeyDown = (e) => {
        if (e.key === "Enter") onHideSuggestions && onHideSuggestions();
        if (e.key === "Escape") onHideSuggestions && onHideSuggestions();
    };
    return (
        <div className="search-container">
            <div className="search-wrapper">
                <input
                    type="text"
                    className="search-input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    role="combobox"
                    aria-expanded={hasSuggestions}
                    aria-controls={suggestionsId}
                    aria-autocomplete="list"
                />
                {value && (
                    <button
                        type="button"
                        className="search-clear"
                        aria-label="Clear search"
                        onClick={() => {
                            onChange("");
                            onHideSuggestions && onHideSuggestions();
                        }}
                    >
                        ×
                    </button>
                )}
                {hasSuggestions && (
                    <ul className="search-suggestions" id={suggestionsId} role="listbox">
                        {suggestions.map((s) => (
                            <li
                                key={s.key}
                                className="search-suggestion-item"
                                role="option"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onSelectSuggestion(s.display);
                                }}
                            >
                                <span className="suggestion-main">
                                    <Highlight text={s.display} query={value} />
                                </span>
                                <span className="suggestion-sub">[{s.sub}]</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
function FilterBar({ mode, filters, onChange, onReset, className }) {
    const isDesktop = mode === "desktop";
    const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
    return (
        <div className={"filter-bar" + (className ? " " + className : "")}>
            <div className="filter-group">
                <label className="filter-label">Price</label>
                <div className="filter-range">
                    <input
                        type="number"
                        min="0"
                        step="500"
                        className="filter-input filter-price"
                        placeholder="Min $"
                        aria-label="Minimum price"
                        value={filters.minPrice}
                        onChange={set("minPrice")}
                    />
                    <span className="filter-sep">–</span>
                    <input
                        type="number"
                        min="0"
                        step="500"
                        className="filter-input filter-price"
                        placeholder="Max $"
                        aria-label="Maximum price"
                        value={filters.maxPrice}
                        onChange={set("maxPrice")}
                    />
                </div>
            </div>
            {isDesktop && (
                <>
                    <div className="filter-group">
                        <label className="filter-label">Class</label>
                        <select className="filter-input" aria-label="Vehicle class" value={filters.vehicleClass} onChange={set("vehicleClass")}>
                            <option value="all">All</option>
                            {Object.entries(CLASS_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Trunk</label>
                        <select className="filter-input" aria-label="Minimum trunk slots" value={filters.minTrunk} onChange={set("minTrunk")}>
                            <option value="all">Any</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={String(n)}>{n}+ slots</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Tank</label>
                        <select className="filter-input" aria-label="Minimum fuel tank size" value={filters.minTank} onChange={set("minTank")}>
                            <option value="all">Any</option>
                            {[45, 70, 85, 100, 120, 150].map((n) => (
                                <option key={n} value={String(n)}>{n}+ L</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Consump.</label>
                        <select className="filter-input" aria-label="Maximum fuel consumption" value={filters.maxConsumption} onChange={set("maxConsumption")}>
                            <option value="all">Any</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={String(n)}>≤ {n} L/100km</option>
                            ))}
                        </select>
                    </div>
                </>
            )}
            <div className="filter-group">
                <label className="filter-label">Sort</label>
                <select className="filter-input" aria-label="Sort by price" value={filters.sort} onChange={set("sort")}>
                    <option value="default">Default</option>
                    <option value="price-high">Price: high to low</option>
                    <option value="price-low">Price: low to high</option>
                </select>
            </div>
            <button type="button" className="filter-reset" onClick={onReset} disabled={!hasActiveFilters(filters)}>
                Reset
            </button>
        </div>
    );
}
function Pagination({ currentPage, totalPages, onPrev, onNext }) {
    if (totalPages <= 1) return null;
    return (
        <div className="pagination">
            <button onClick={onPrev} disabled={currentPage <= 1}>
                Prev
            </button>
            <span>
                Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
            </span>
            <button onClick={onNext} disabled={currentPage >= totalPages}>
                Next
            </button>
        </div>
    );
}
function Toast({ text }) {
    if (!text) return null;
    return (
        <div className="toast">
            Copied: <b>{text}</b>
        </div>
    );
}
function SkeletonCard() {
    return (
        <div className="car-card skeleton-card">
            <div className="car-image-wrapper skeleton-image" />
            <div className="car-card-content">
                <div className="skeleton-line skeleton-line-lg" />
                <div className="skeleton-line skeleton-line-sm" />
                <div className="skeleton-line skeleton-line-sm" />
            </div>
            <div className="price-panel">
                <div className="skeleton-line skeleton-line-price" />
                <div className="skeleton-line skeleton-line-btn" />
            </div>
        </div>
    );
}
function SkeletonList() {
    const items = Array.from({ length: 8 });
    return (
        <div className="autosalon-container">
            {items.map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
function normalizeVehicles(vehiclesRaw, mode) {
    const realNames = typeof REAL_NAMES !== "undefined" ? REAL_NAMES : {};
    if (mode === "mobile") {
        return vehiclesRaw.map((item, idx) => {
            const id2 = pad2(item.model);
            const fullmodel = String(item.fullmodel ?? "");
            const model_fullmodel = `${id2}_${fullmodel}`;
            const real_name = realNames[fullmodel] || "";
            const rarity = String(item.rarity ?? "");
            const tokens = [
                id2,
                model_fullmodel,
                fullmodel,
                real_name,
                rarity,
                String(item.price ?? ""),
            ]
                .filter(Boolean)
                .map((s) => String(s).toLowerCase());
            return {
                key: model_fullmodel || String(idx),
                mode,
                displayName: real_name || model_fullmodel || fullmodel || "Not Found",
                codeLabel: "CarID",
                codeValue: id2,
                imageSrc: "/image/" + model_fullmodel + ".png",
                imageAlt: model_fullmodel,
                hideImageOnError: true,
                price: item.price,
                copyValue: id2,
                copyLabel: "Copy CarID",
                suggestionDisplay: real_name || model_fullmodel,
                suggestionSub: model_fullmodel,
                tokens,
                variants: item.variants || [],
                pills: [
                    {
                        text: `🏷️ Tech name: ${model_fullmodel}`,
                        kind: "default",
                    },
                    {
                        text: `⭐ Rarity: ${rarity || "-"}`,
                        kind: "rarity",
                        rarity,
                    },
                    ...(item.variants?.length
                        ? [{
                            text: `🗜️ BodyKit: ${item.variants.length}`,
                            kind: "bodykit",
                        }]
                        : []),
                ],
            };
        });
    }
    return vehiclesRaw.map((item, idx) => {
        const model = String(item.model ?? "");
        const modelLower = model.toLowerCase();
        const realName = realNames[modelLower] || "";
        const tokens = [
            model,
            realName,
            String(item.price ?? ""),
            String(item.truck_size ?? ""),
            String(item.tank_size ?? ""),
            String(item.consumption ?? ""),
        ]
            .filter(Boolean)
            .map((s) => String(s).toLowerCase());
        return {
            key: model || String(idx),
            mode,
            displayName: realName || "Not Found",
            codeLabel: "veh",
            codeValue: model,
            imageSrc: "https://launcher.gta5grand.com/game/images/allveh/" + modelLower + ".png",
            imageAlt: model,
            hideImageOnError: false,
            price: item.price,
            truckSize: item.truck_size,
            tankSize: item.tank_size,
            consumption: item.consumption,
            vehicleClass: classifyVehicle(item),
            copyValue: model,
            copyLabel: "Copy model name",
            suggestionDisplay: realName || model,
            suggestionSub: model,
            tokens,
            pills: [
                { text: `🧳 Trunk: ${(Number(item.truck_size) || 0) * 6} slots`, kind: "default" },
                { text: `⛽ Tank: ${Number(item.tank_size) || 0} L`, kind: "default" },
                ...(item.consumption
                    ? [{ text: `🔥 Fuel consumption: ${item.consumption} L / 100 km`, kind: "default" }]
                    : []),
            ],
        };
    });
}
function CarCard({ item, query, onCopy, onShowBodykits }) {
    const usdPrice = formatUsd(item.price);
    const rarityTag = item.mode === "mobile" ? rarityStyles(item.pills?.find((p) => p.kind === "rarity")?.rarity) : null;
    const rarityTagStyle =
        rarityTag && rarityTag.color
            ? {
                color: rarityTag.color,
                background: rarityTag.background,
                border: `1px solid ${rarityTag.border}`,
                padding: "3px 10px",
                borderRadius: "999px",
            }
            : null;
    return (
        <article className="car-card">
            <div className="car-image-wrapper">
                <img
                    src={item.imageSrc}
                    alt={item.imageAlt}
                    loading="lazy"
                    onError={
                        item.hideImageOnError
                            ? (e) => {
                                e.currentTarget.style.visibility = "hidden";
                            }
                            : undefined
                    }
                />
            </div>
            <div className="car-card-content">
                <p className="model">
                    <b>
                        <Highlight text={item.displayName} query={query} />
                    </b>
                    <br />
                    <span className="model-code">
                        [{item.codeLabel}:&nbsp;
                        <Highlight text={item.codeValue} query={query} />]
                    </span>
                </p>
                <div className="meta-row">
                    {item.pills.map((p, idx) => {
                        if (p.kind === "rarity") {
                            return (
                                <span key={idx} className="meta-item" style={rarityTagStyle || undefined}>
                                    <Highlight text={p.text} query={query} />
                                </span>
                            );
                        }
                        if (p.kind === "bodykit") {
                            return (
                                <span
                                    key={idx}
                                    className="meta-item bodykit-pill"
                                    onClick={() => onShowBodykits(item.variants)}
                                >
                                    <Highlight text={p.text} query={query} />
                                </span>
                            );
                        }
                        return (
                            <span key={idx} className="meta-item">
                                <Highlight text={p.text} query={query} />
                            </span>
                        );
                    })}
                </div>
            </div>
            <div className="price-panel">
                {usdPrice && <div className="price-usd">{usdPrice}</div>}
                <button className="copy-btn" type="button" aria-label={item.copyLabel} onClick={() => onCopy(item.copyValue)}>
                    {item.copyLabel}
                </button>
            </div>
        </article>
    );
}
function CarList({ vehicles, query, onCopy, onShowBodykits, emptyHint }) {
    if (!vehicles.length) {
        return (
            <div className="empty-state">
                <p>No vehicles found</p>
                <span>{emptyHint}</span>
            </div>
        );
    }
    const containerClass = "autosalon-container" + (vehicles.length === 1 ? " single-result" : "");
    return (
        <div className={containerClass}>
            {vehicles.map((item) => (
                <CarCard key={item.key} item={item} query={query} onCopy={onCopy} onShowBodykits={onShowBodykits} />
            ))}
        </div>
    );
}

function App() {
    const vehiclesRaw = typeof VEHICLES !== "undefined" && Array.isArray(VEHICLES) ? VEHICLES : [];
    const mode = useMemo(() => detectMode(vehiclesRaw), [vehiclesRaw]);
    const copyToastTimerRef = useRef(null);

    const [isDark, setIsDark] = useState(() => {
        try {
            return localStorage.getItem("theme") === "dark";
        } catch (e) {
            return false;
        }
    });

    useEffect(() => {
        try {
            if (isDark) {
                document.documentElement.setAttribute("data-theme", "dark");
                localStorage.setItem("theme", "dark");
            } else {
                document.documentElement.removeAttribute("data-theme");
                localStorage.setItem("theme", "light");
            }
        } catch (e) {
            // Ignore storage access errors in restricted environments.
        }
    }, [isDark]);

    useEffect(() => {
        return () => {
            if (copyToastTimerRef.current) {
                window.clearTimeout(copyToastTimerRef.current);
            }
        };
    }, []);

    const toggleTheme = () => setIsDark((p) => !p);

    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [currentPage, setCurrentPage] = useState(1);
    const [copied, setCopied] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [bodykits, setBodykits] = useState(null);
    const itemsPerPage = 15;

    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), mode === "mobile" ? 250 : 300);
        return () => clearTimeout(t);
    }, [mode]);

    const preparedVehicles = useMemo(() => normalizeVehicles(vehiclesRaw, mode), [vehiclesRaw, mode]);
    const vehiclesForBrowse = useMemo(() => {
        if (mode === "desktop") return [...preparedVehicles].reverse();
        return preparedVehicles;
    }, [preparedVehicles, mode]);

    const filteredVehicles = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const minPrice = filters.minPrice === "" ? null : Number(filters.minPrice);
        const maxPrice = filters.maxPrice === "" ? null : Number(filters.maxPrice);
        const minTrunk = filters.minTrunk === "all" ? 0 : Number(filters.minTrunk);
        const minTank = filters.minTank === "all" ? 0 : Number(filters.minTank);
        const maxConsumption = filters.maxConsumption === "all" ? Infinity : Number(filters.maxConsumption);
        return vehiclesForBrowse.filter((v) => {
            if (q && !v.tokens.some((t) => t.includes(q))) return false;
            const price = Number(v.price);
            if (minPrice !== null && !(price >= minPrice)) return false;
            if (maxPrice !== null && !(price <= maxPrice)) return false;
            if (v.truckSize !== undefined) {
                if (Number(v.truckSize) < minTrunk) return false;
                if (Number(v.tankSize) < minTank) return false;
                if (Number(v.consumption) > maxConsumption) return false;
            }
            if (filters.vehicleClass !== "all" && v.vehicleClass !== filters.vehicleClass) return false;
            return true;
        }).sort((a, b) => {
            if (filters.sort === "price-high") return Number(b.price) - Number(a.price);
            if (filters.sort === "price-low") return Number(a.price) - Number(b.price);
            return 0;
        });
    }, [vehiclesForBrowse, searchQuery, filters]);

    const totalPages = useMemo(() => {
        if (!filteredVehicles.length) return 0;
        return Math.ceil(filteredVehicles.length / itemsPerPage);
    }, [filteredVehicles.length]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filters]);

    const paginatedVehicles = useMemo(() => {
        if (!filteredVehicles.length) return [];
        const start = (currentPage - 1) * itemsPerPage;
        return filteredVehicles.slice(start, start + itemsPerPage);
    }, [filteredVehicles, currentPage]);

    const suggestions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (q.length < 2) return [];
        const res = [];
        const seen = new Set();
        for (const v of preparedVehicles) {
            const match = v.tokens.some((t) => t.includes(q));
            if (match) {
                if (!seen.has(v.key)) {
                    seen.add(v.key);
                    res.push({
                        key: v.key,
                        display: v.suggestionDisplay,
                        sub: v.suggestionSub,
                    });
                }
            }
            if (res.length >= 8) break;
        }
        return res;
    }, [preparedVehicles, searchQuery]);

    const handleCopy = async (text) => {
        const v = String(text ?? "");
        try {
            if (!navigator.clipboard || !navigator.clipboard.writeText) {
                throw new Error("Clipboard API is not available");
            }
            await navigator.clipboard.writeText(v);
        } catch (e) {
            try {
                const ta = document.createElement("textarea");
                ta.value = v;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
            } catch (fallbackError) {
                setCopied("Copy failed");
                return;
            }
        }
        setCopied(v);
        if (copyToastTimerRef.current) {
            window.clearTimeout(copyToastTimerRef.current);
        }
        copyToastTimerRef.current = window.setTimeout(() => setCopied(""), 1200);
    };

    const placeholder =
        mode === "mobile" ? "Enter a CarID (or vehicle name)" : "Enter a model name (or vehicle name)";
    const emptyHint =
        mode === "mobile" ? "Try a different CarID (or vehicle name)" : "Try a different model name (or vehicle name)";

    return (
        <>
            <Header mode={mode} isDark={isDark} toggleTheme={toggleTheme} />
            <SearchBar
                value={searchQuery}
                onChange={(v) => {
                    setSearchQuery(v);
                    setShowSuggestions(v.trim().length >= 2);
                }}
                suggestions={suggestions}
                onSelectSuggestion={(display) => {
                    setSearchQuery(display);
                    setShowSuggestions(false);
                }}
                showSuggestions={showSuggestions}
                onHideSuggestions={() => setShowSuggestions(false)}
                placeholder={placeholder}
            />
            <FilterBar
                mode={mode}
                filters={filters}
                onChange={setFilters}
                onReset={() => setFilters(DEFAULT_FILTERS)}
            />
            {isLoading ? (
                <SkeletonList />
            ) : (
                <CarList
                    vehicles={paginatedVehicles}
                    query={searchQuery}
                    onCopy={handleCopy}
                    onShowBodykits={setBodykits}
                    emptyHint={emptyHint}
                />
            )}
            {!isLoading && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                />
            )}
            {bodykits && (
                <div className="bodykit-modal-overlay" onClick={() => setBodykits(null)}>
                    <div className="bodykit-modal" onClick={(e) => e.stopPropagation()} >
                        <button className="bodykit-close" onClick={() => setBodykits(null)}>✕</button>
                        <div className="bodykit-grid">
                            {bodykits.map((kit, idx) => (
                                <div key={idx} className="bodykit-item">
                                    <h3>{kit.name}</h3>
                                    <img src={`/image/${kit.render}.png`} alt={kit.name}/>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            )}
            <Toast text={copied} />
        </>
    );
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);