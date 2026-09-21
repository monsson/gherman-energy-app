import type { Role } from "./auth";

/**
 * Ghidul de utilizare, ca date: sectiuni de blocuri tipizate, randate de `routes/guide.tsx`.
 *
 * Textul sta aici, nu in componenta, ca sa poata fi citit si in afara React-ului (de exemplu ca
 * scenariu pentru videoclipuri). Marcaj inline permis: `**bold**`, `*italic*`, `` `cod` ``.
 *
 * Scopul: numai ce poate face un utilizator conectat, din ecranele aplicatiei. Cum se opereaza
 * serverul, ce face back-office-ul sau cum ajung datele din portal nu isi au locul aici, decat
 * acolo unde explica de ce un ecran arata ce arata.
 */

export type GuideBlock =
  | { kind: "p"; text: string }
  | { kind: "h3"; id: string; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "note"; tone: "info" | "warn" | "danger"; title: string; text: string }
  | { kind: "flow"; steps: { name: string; sub?: string }[]; caption?: string }
  | { kind: "sample"; text: string };

export type GuideSection = {
  /** Ancora sectiunii (`/guide#<id>`). */
  id: string;
  title: string;
  /** Cine vede sectiunea. Un sofer nu are ecranele managerului, deci nici textul despre ele. */
  roles: Role[];
  blocks: GuideBlock[];
};

/**
 * Cate un videoclip per rol, inregistrat manual, nu per sectiune: `manager.ro.mp4` parcurge toate
 * sectiunile managerului, `sofer.ro.mp4` pe ale soferului. Numele fisierului: `<id>.<limba>.mp4`.
 */
export const GUIDE_VIDEOS = {
  manager: "Ghidul managerului de flotă",
  sofer: "Ghidul șoferului",
} as const;

export type GuideVideoId = keyof typeof GUIDE_VIDEOS;

/** Videoclipul pe care il vede un rol; id-urile fisierelor sunt in romana, ca restul ghidului. */
export function guideVideoFor(role: Role): GuideVideoId {
  return role === "manager" ? "manager" : "sofer";
}

/** Singura limba a aplicatiei; videoclipurile au aceeasi limba, deci nu exista comutator. */
export const GUIDE_LANG = "ro";

/**
 * Videoclipurile nu sunt in bundle: se copiaza pe server in `guide/` de langa `index.html`, sau
 * la `VITE_GUIDE_MEDIA_URL` cand stau in alta parte. Un `.env` fara variabila da `guide/`
 * relativ la subcalea aplicatiei, deci fisierele urmeaza `BASE_PATH` ca tot restul.
 */
export function guideVideoUrl(video: GuideVideoId, lang: string): string {
  const base = import.meta.env.VITE_GUIDE_MEDIA_URL?.trim() || `${import.meta.env.BASE_URL}guide/`;
  return `${base.endsWith("/") ? base : `${base}/`}${video}.${lang}.mp4`;
}

const BOTH: Role[] = ["manager", "driver"];
const MANAGER: Role[] = ["manager"];
const DRIVER: Role[] = ["driver"];

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "autentificare",
    title: "Conectarea și contul",
    roles: BOTH,
    blocks: [
      {
        kind: "p",
        text:
          "Aplicația se deschide în browser, pe telefon sau pe calculator, și cere de la început utilizatorul și parola contului tău Gherman Energy. Contul are un rol: **manager de flotă** sau **șofer**. Rolul decide ce ecran se deschide după conectare și ce poți face în el.",
      },
      {
        kind: "flow",
        steps: [
          { name: "Deschide adresa aplicației", sub: "Pagina de login are sigla Gherman Energy." },
          { name: "Completează **Utilizator** și **Parolă**", sub: "Utilizatorul este cel primit de la administrator, de forma `prenume.nume`." },
          { name: "Apasă **Intră în cont**", sub: "Managerul ajunge pe panoul flotei, șoferul pe ecranul lui." },
        ],
      },
      {
        kind: "table",
        head: ["Mesajul de la login", "Ce înseamnă"],
        rows: [
          ["Utilizator sau parolă incorecte.", "Verifică tastarea; parola ține cont de majuscule."],
          ["Contul este blocat temporar după prea multe încercări.", "Așteaptă câteva minute și încearcă din nou."],
          ["Parola este corectă, dar contul nu are drept de acces la aplicația mobilă.", "Contul există, dar nu are rolul de aplicație. Cere administratorului să îl atribuie."],
          ["Serverul nu răspunde.", "Verifică conexiunea la internet și reîncearcă."],
          ["Sesiunea a expirat. Autentifică-te din nou.", "Ai stat prea mult neconectat; datele tale sunt neatinse, doar reintră în cont."],
        ],
      },
      { kind: "h3", id: "autentificare-ecran", text: "Ce este mereu pe ecran" },
      {
        kind: "ul",
        items: [
          "**Antetul** de sus: sigla, butonul de **mod întunecat / mod luminos** (luna sau soarele) și butonul **Ieșire**, care închide sesiunea pe acest dispozitiv.",
          "**Bara de jos**: intrările principale ale rolului tău și, în dreapta, contul, cu numele de utilizator sub el.",
          "Pe ecranele de detaliu, săgeata **Înapoi** din stânga titlului te duce la lista din care ai venit.",
        ],
      },
      { kind: "h3", id: "autentificare-parola", text: "Schimbarea parolei" },
      {
        kind: "p",
        text:
          "Apasă pe **cont**, în dreapta barei de jos. Se deschide **Contul meu**, care arată cu cine ești conectat și, la manager, compania. Tot de aici deschizi acest ghid. Sub **Schimbă parola** completezi parola actuală, parola nouă și confirmarea ei, apoi **Salvează parola**.",
      },
      {
        kind: "note",
        tone: "info",
        title: "Regulile parolei",
        text:
          "Parola nouă are cel puțin 6 caractere și trebuie tastată identic în ambele câmpuri. Dacă parola actuală este greșită, aplicația spune asta și nu schimbă nimic. La reușită apare **Parola a fost schimbată** și rămâi conectat. Aplicația nu are resetare de parolă: dacă ai uitat-o, administratorul ți-o resetează.",
      },
    ],
  },

  {
    id: "panou-manager",
    title: "Panoul managerului",
    roles: MANAGER,
    blocks: [
      {
        kind: "p",
        text:
          "Ecranul **Acasă** al managerului adună într-o singură pagină cheltuiala flotei, mașinile care au nevoie de atenție și ultimele alimentări. Totul de aici se poate deschide mai departe, cu **Vezi toate →** sau atingând un rând.",
      },
      { kind: "h3", id: "panou-sumar", text: "Sumar 6 luni și grafice" },
      {
        kind: "ul",
        items: [
          "**Total cheltuit**, **Total litri**, **Distanță** și **Consum mediu** (litri la suta de kilometri) pe ultimele șase luni, pentru toată flota pe care o vezi.",
          "**Consum mediu (L/100km)**: câte o coloană pe lună. O lună fără kilometraj raportat rămâne fără coloană, nu cu zero — consumul ei este necunoscut, nu nul.",
          "**Kilometri parcurși**: distanța pe lună, calculată din kilometrajul trecut la pompă.",
        ],
      },
      {
        kind: "note",
        tone: "warn",
        title: "Kilometrajul vine de la pompă",
        text:
          "Distanța și consumul se calculează din kilometrajul pe care șoferul îl tastează la alimentare. O cifră greșită acolo dă o lună cu consum absurd; aplicația o arată așa cum a fost raportată, nu o corectează.",
      },
      { kind: "h3", id: "panou-masini", text: "Mașini, alimentări recente, stații" },
      {
        kind: "ul",
        items: [
          "**Mașini (N)**: primele trei mașini ale flotei și, dacă este cazul, un chenar roșu cu **câte mașini au documente expirate**. O mașină cu ITP, RCA sau rovinietă expirată apare cu marginea roșie și insigna **Expirat** peste tot în aplicație.",
          "**Alimentări recente**: ultimele cinci alimentări din flotă, cu numărul mașinii, stația, furnizorul de carburant, data, litrii și suma.",
          "**Stații**: numărul de stații din nomenclator; atinge cardul ca să ajungi la lista lor.",
        ],
      },
    ],
  },

  {
    id: "flota",
    title: "Flota de mașini",
    roles: MANAGER,
    blocks: [
      {
        kind: "p",
        text:
          "**Mașini** din bara de jos deschide **Toate mașinile**: fiecare mașină este un card cu numărul de înmatriculare, marca și modelul când sunt cunoscute, șoferul asignat și starea plafonului lunar. Atinge cardul ca să deschizi fișa mașinii.",
      },
      { kind: "h3", id: "flota-cautare", text: "Căutare și filtre" },
      {
        kind: "ul",
        items: [
          "Caseta **Caută după număr, marcă, model sau șofer** filtrează pe măsură ce tastezi; merge și cu o bucată din numărul de înmatriculare.",
          "**Toate** / **Expirate**: mașinile cu cel puțin un document expirat.",
          "**Aproape de plafon**: mașinile care au consumat peste 80% din plafonul lunar, cele mai apropiate de limită primele. Filtrul apare doar când există astfel de mașini — la început de lună lipsește de obicei.",
          "**Blocate**: mașinile pe care portalul le-a barat la pompă (vezi *Plafoanele de carburant*).",
          "**Mici** / **Utilitare**: după segment, doar dacă flota are segmentul completat.",
          "Lista se încarcă în tranșe de 30; **Arată încă …** aduce următoarea tranșă.",
        ],
      },
      { kind: "h3", id: "flota-card", text: "Ce spune cardul unei mașini" },
      {
        kind: "table",
        head: ["Pe card", "Înseamnă"],
        rows: [
          ["`12,0 L / 1.000 L` și o bară colorată", "Cât din plafonul lunar s-a consumat luna aceasta, cu suma în lei alături. Verde: în regulă. Portocaliu: peste 80%. Roșu: plafon atins."],
          ["**Fără plafon · 12,0 L luna aceasta**", "Mașina nu are plafon lunar în portal; se arată doar consumul."],
          ["**Blocată la alimentare**", "Portalul barează mașina la pompă. Nu se schimbă din aplicație."],
          ["⏳ **Plafon lunar → 1.200 L**", "O cerere de modificare a plecat și așteaptă răspunsul portalului."],
          ["**Expirat**, chenar roșu", "Cel puțin un document (ITP, RCA, rovinietă) a expirat."],
        ],
      },
      { kind: "h3", id: "flota-masina-noua", text: "Mașină nouă și editare" },
      {
        kind: "p",
        text:
          "**Mașină nouă**, deasupra listei, deschide formularul: **Număr înmatriculare**, **Marca** și **Model** (obligatorii), apoi **An fabricație**, **Segment**, **Combustibil** și **Șofer asignat**. Un număr de înmatriculare deja folosit este refuzat. Aceleași câmpuri se schimbă cu **Editează mașina** din fișa mașinii.",
      },
      {
        kind: "note",
        tone: "info",
        title: "Termenele nu se editează aici",
        text:
          "Datele de expirare ITP, RCA și rovinietă nu sunt câmpuri pe mașină: vin din documentele ei și se schimbă încărcând documentul, în secțiunea **Documente** a fișei. Un termen fără document scanat se introduce doar în back-office.",
      },
    ],
  },

  {
    id: "fisa-masina",
    title: "Fișa mașinii și documentele",
    roles: BOTH,
    blocks: [
      {
        kind: "p",
        text:
          "Fișa unei mașini se deschide din orice listă de mașini sau atingând o alimentare. Sus stau numărul de înmatriculare, segmentul, marca și modelul, anul și combustibilul, apoi șoferul asignat cu ultimele cifre ale cardului lui. Urmează **Plafoane de carburant**, **Documente**, **Sumar 6 luni**, graficul de consum lunar și **Alimentări, ultimul an**.",
      },
      {
        kind: "p",
        text:
          "Managerul are în plus butonul **Editează mașina** și poate cere plafoane și încărca documente. Șoferul vede aceleași secțiuni, fără butoanele de modificare.",
      },
      { kind: "h3", id: "documente-stari", text: "Documente: ITP, RCA, rovinietă" },
      {
        kind: "p",
        text:
          "Fiecare tip de document are rândul lui, cu **data până la care este valabil** și o insignă. Rândul poate avea un scan de descărcat și o listă de **Reînnoiri anterioare**, strânsă implicit.",
      },
      {
        kind: "table",
        head: ["Insigna", "Înseamnă"],
        rows: [
          ["**Valabil** (✓)", "Termenul curent este în viitor."],
          ["**Expirat** (!, roșu)", "Termenul a trecut. Mașina apare cu roșu în liste și în alerta de pe panoul managerului."],
          ["**Necunoscut** (?)", "Nu există niciun termen pentru acest tip. Nu înseamnă expirat, ci necompletat."],
        ],
      },
      {
        kind: "ul",
        items: [
          "**⬇ Descarcă** apare doar pe documentul curent și doar când are un scan. Un rând cu textul **Termen fără document scanat** are data trecută în back-office, dar nu și fișierul.",
          "Reînnoirile anterioare arată termenul vechi și dacă a avut scan; scanurile lor nu se pot descărca din aplicație, doar cel curent.",
        ],
      },
      { kind: "h3", id: "documente-incarcare", text: "Încărcarea unui document (manager)" },
      {
        kind: "flow",
        steps: [
          { name: "**+ Încarcă** din colțul secțiunii, sau linkul **Încarcă** de pe rândul unui tip", sub: "Rândul preselectează tipul; altfel îl alegi din **Tip document**." },
          { name: "Completează **Valabil până la**", sub: "Obligatoriu. **Data emiterii** este opțională și nu poate fi după expirare." },
          { name: "Alege **Scan**", sub: "PDF, JPG, JPEG sau PNG, cel mult 10 MB." },
          { name: "**Încarcă documentul**", sub: "Termenele mașinii se recalculează pe loc, inclusiv insigna roșie din liste." },
        ],
        caption:
          "Un scan încărcat pe același termen îl înlocuiește pe cel vechi. Un termen diferit este o reînnoire: cel nou devine documentul curent, cel vechi coboară în istoric.",
      },
      { kind: "h3", id: "fisa-consum", text: "Consumul și alimentările mașinii" },
      {
        kind: "ul",
        items: [
          "**Sumar 6 luni**: total cheltuit, total litri, distanță și consum mediu, doar pentru această mașină.",
          "**Consum mediu lunar (L/100km)**: câte o coloană pe lună; lună fără kilometraj înseamnă coloană lipsă.",
          "**Alimentări, ultimul an**: fiecare alimentare cu stația, furnizorul de carburant, data și ora, litrii, kilometrii parcurși de la alimentarea precedentă, suma și prețul pe litru. Managerul poate atinge rândul ca să ajungă la pagina stației.",
        ],
      },
    ],
  },

  {
    id: "plafoane",
    title: "Plafoanele de carburant",
    roles: MANAGER,
    blocks: [
      {
        kind: "p",
        text:
          "Fiecare mașină are în portalul furnizorului de carburant trei plafoane: **lunar**, **săptămânal** și **zilnic**, toate în **litri**. Portalul este cel care oprește pompa, deci aplicația arată valorile lui și îi trimite cereri de modificare; nu le schimbă direct.",
      },
      {
        kind: "table",
        head: ["Pe rândul unui plafon", "Înseamnă"],
        rows: [
          ["`1.000 L`", "Plafonul din portal."],
          ["**Fără plafon**", "Starea *Nelimitat* din portal: mașina alimentează fără limită pe perioada respectivă."],
          ["**Blocată la alimentare**", "Portalul barează mașina la pompă (o valoare de cel mult un litru). Deblocarea nu se cere din aplicație."],
          ["**Necunoscut**", "Aplicația nu a citit încă valoarea din portal. Nu înseamnă *fără plafon*."],
        ],
      },
      {
        kind: "p",
        text:
          "Rândul lunar arată în plus **Consumat luna aceasta**, bara de progres și o **estimare în lei** a plafonului, calculată la prețul mediu al alimentărilor recente. Estimarea este un ordin de mărime: la pompă contează litrii.",
      },
      { kind: "h3", id: "plafoane-cerere", text: "Cererea de modificare" },
      {
        kind: "flow",
        steps: [
          { name: "**Modifică** din colțul secțiunii, sau **Schimbă** de pe rândul plafonului", sub: "Se deschide **Modifică plafonul**, cu plafonul preselectat în **Care plafon**." },
          { name: "Alege **Limitare la** sau **Fără plafon**", sub: "*Fără plafon* se cere explicit, nu lăsând caseta goală." },
          { name: "Tastează noul plafon, **în litri**", sub: "Estimarea în lei se recalculează pe măsură ce tastezi, ca să vezi dacă ai gândit în bani." },
          { name: "**Trimite cererea**", sub: "Plafonul de pe ecran rămâne cel vechi până când portalul confirmă." },
        ],
      },
      {
        kind: "note",
        tone: "danger",
        title: "Litri, nu lei",
        text:
          "Cine gândește în bani tastează 5000 și cere 5.000 de litri, de peste zece ori plafonul unei mașini. Aplicația refuză peste 10.000 L lunar, 4.000 L săptămânal și 2.000 L zilnic, dar sub prag cifra trece: uită-te la estimarea în lei înainte de a trimite.",
      },
      {
        kind: "p",
        text: "Cererea este refuzată pe loc, cu explicație, în aceste cazuri:",
      },
      {
        kind: "ul",
        items: [
          "valoarea lipsește sau este negativă;",
          "valoarea depășește pragul perioadei;",
          "valoarea este între 0 și 1 litru: un asemenea plafon nu limitează, ci **barează** mașina, iar bararea se cere separat;",
          "valoarea este egală cu plafonul de acum;",
          "mașina are deja o cerere în așteptare pe același plafon (pe alt plafon se poate).",
        ],
      },
      { kind: "h3", id: "plafoane-raspuns", text: "Ce se întâmplă după trimitere" },
      {
        kind: "p",
        text:
          "Sub plafon apare insigna **În așteptare** și textul *În curs de modificare la 1.200 L*; aceeași cerere se vede și pe cardul mașinii din listă, cu ⏳. Cererea pleacă spre portal automat, în câteva minute. Cât timp ții pagina deschisă, aplicația verifică răspunsul și îl arată sus în secțiune:",
      },
      {
        kind: "table",
        head: ["Mesaj", "Înseamnă"],
        rows: [
          ["**Portalul a confirmat plafonul lunar: 1.200 L.** (verde)", "Gata: de acum valoarea nouă oprește pompa."],
          ["**Portalul nu a aplicat plafonul** (roșu)", "Portalul a refuzat sau nu a reținut valoarea; dedesubt este motivul, așa cum l-a scris serverul. Plafonul a rămas cel vechi."],
          ["**Cererea este încă în coadă.** (gri)", "Au trecut câteva minute fără răspuns. Reîncarcă pagina mai târziu; cererea nu s-a pierdut."],
        ],
      },
    ],
  },

  {
    id: "alimentari-statii",
    title: "Alimentări și stații",
    roles: MANAGER,
    blocks: [
      {
        kind: "p",
        text:
          "**Alimentări** din bara de jos listează alimentările flotei, grupate pe zile, cu totalul zilei în dreptul datei. Deocamdată sunt alimentările **Rompetrol (Fill&Go)**; alți furnizori se adaugă ulterior, și fiecare rând poartă insigna furnizorului la care s-a alimentat.",
      },
      { kind: "h3", id: "alimentari-filtre", text: "Perioada și filtrele" },
      {
        kind: "ul",
        items: [
          "**30 zile** / **3 luni** / **12 luni**: cât în urmă se caută.",
          "**Toate mașinile** și **Toți șoferii**: două liste cu căutare; alege una sau ambele, ștergerea cu × revine la tot.",
          "Un rând arată numărul mașinii, furnizorul, stația, combustibilul, litrii, data și ora, suma și prețul pe litru. Atinge rândul ca să deschizi fișa mașinii.",
          "Când perioada are peste 1.000 de alimentări, lista se oprește la cele mai recente 1.000 și o spune: restrânge perioada sau filtrează.",
        ],
      },
      {
        kind: "note",
        tone: "info",
        title: "Alimentările nu sunt în timp real",
        text:
          "Alimentările se preiau din portalul furnizorului de două ori pe oră. O alimentare făcută acum apare în aplicație în cel mult o jumătate de oră, cu litrii, prețul și kilometrajul tastat la pompă.",
      },
      { kind: "h3", id: "statii", text: "Stații" },
      {
        kind: "p",
        text:
          "Cardul **Stații** de pe panou, sau **Vezi toate →**, deschide nomenclatorul de stații, cu **Caută stația** după nume sau adresă și, pe fiecare rând, prețul la **B**enzină și la **M**otorină când este completat. Lista se încarcă în tranșe de 30.",
      },
      {
        kind: "p",
        text:
          "Pagina unei stații arată prețurile ei la **Benzină** și **Motorină**, **Total alimentări** și **Total litri** ale flotei acolo, și **Alimentări, ultimul an** ale flotei în stația respectivă. Ajungi la ea și dintr-o alimentare de pe fișa unei mașini.",
      },
      {
        kind: "note",
        tone: "info",
        title: "Prețurile stațiilor",
        text:
          "Prețul unei stații este cel introdus în back-office, nu cel de la ultima alimentare. O stație fără preț completat apare fără insigne.",
      },
    ],
  },

  {
    id: "facturi",
    title: "Facturi",
    roles: MANAGER,
    blocks: [
      {
        kind: "p",
        text:
          "**Facturi** din bara de jos listează facturile Gherman Energy către compania ta din ultimul an. Când există facturi neachitate, sus stă cardul **De plată**, cu suma rămasă de plătit și câte facturi o compun.",
      },
      {
        kind: "ul",
        items: [
          "Fiecare rând: numărul facturii, **Emisă** la data, **scadență**, totalul și insigna **Achitată** sau **Neachitată**. O factură plătită parțial arată și **Rest de plată**.",
          "Atinge rândul ca să deschizi factura.",
        ],
      },
      { kind: "h3", id: "facturi-detaliu", text: "Detaliul facturii și PDF-ul" },
      {
        kind: "ul",
        items: [
          "Sus: **Factură fiscală**, numărul, data emiterii și scadența, starea, **Furnizor** (Gherman Energy, cu CUI și adresă) și **Beneficiar** (compania ta).",
          "**Sumar**: **Total**, **Sold** sau **Rest de plată**, **Subtotal (fără TVA)**, **TVA** și **Total de plată**.",
          "**📄 Descarcă PDF** salvează factura ca fișier. Dacă serverul nu poate genera PDF-ul, aplicația spune asta; anunță administratorul.",
          "**Linii factură**: denumire, cantitate, preț și total pe fiecare linie.",
          "**Alimentări din perioada facturii**: alimentările flotei acoperite de factură, ca în lista de alimentări.",
        ],
      },
    ],
  },

  {
    id: "sofer",
    title: "Ecranul șoferului",
    roles: DRIVER,
    blocks: [
      {
        kind: "p",
        text:
          "După conectare, șoferul are un singur ecran, **Acasă**, cu tot ce îl privește: cardul de carburant, mașina și cât din plafon i-a rămas, ultimele alimentări și cele mai bune prețuri. Vezi doar mașinile și alimentările tale.",
      },
      { kind: "h3", id: "sofer-card", text: "Cardul meu" },
      {
        kind: "p",
        text:
          "Fiecare card de carburant asociat contului tău apare ca un card: **GE Fleet Card**, numele tău, furnizorul la care se folosește (Rompetrol, MOL sau Socar) și ultimele cifre ale numărului. Dacă nu ai niciun card activ, ecranul spune asta.",
      },
      { kind: "h3", id: "sofer-masina", text: "Mașina mea" },
      {
        kind: "p",
        text:
          "Mașina (sau mașinile) pe care ești asignat, cu bara plafonului lunar: **12,0 L / 1.000 L** și suma în lei. Verde înseamnă în regulă, portocaliu că ai trecut de 80%, roșu că plafonul s-a atins. **Blocată la alimentare** înseamnă că portalul a barat mașina la pompă; vorbește cu managerul flotei. Plafonul este al mașinii, nu al șoferului: pe fiecare mașină contează bara ei. Dacă nu apare nicio mașină, nu ești încă asignat pe una; cere managerului flotei.",
      },
      {
        kind: "p",
        text:
          "Atinge mașina ca să deschizi fișa ei, cu documentele (poți descărca scanul curent al ITP-ului, RCA-ului sau rovinietei), consumul pe șase luni și alimentările din ultimul an — vezi *Fișa mașinii și documentele*.",
      },
      { kind: "h3", id: "sofer-alimentari", text: "Ultimele 3 alimentări și Top 3 prețuri" },
      {
        kind: "ul",
        items: [
          "**Ultimele 3 alimentări**: stația, furnizorul, data și ora, litrii și suma, pentru cele mai recente trei alimentări ale tale.",
          "**Top 3 prețuri**: cele mai ieftine trei stații din nomenclator, cu prețul la **Benzină** și la **Motorină**. Dacă niciun preț nu este completat, ecranul spune că prețurile nu sunt încă disponibile.",
        ],
      },
    ],
  },
];

/** Sectiunile pe care le vede un rol, in ordinea ghidului. */
export function guideSectionsFor(role: Role): GuideSection[] {
  return GUIDE_SECTIONS.filter((s) => s.roles.includes(role));
}

// Invarianta pe care nu o poate prinde tipul: ancorele unice. Nu exista o suita de teste in
// proiect, deci se verifica la incarcarea modulului, in dezvoltare - `npm run dev` cade cu mesajul
// de mai jos, nu productia.
if (import.meta.env.DEV) {
  const anchors = new Set<string>();
  for (const section of GUIDE_SECTIONS) {
    if (anchors.has(section.id)) throw new Error(`guide: ancoră duplicată „${section.id}”`);
    anchors.add(section.id);
    for (const block of section.blocks) {
      if (block.kind === "h3") {
        if (anchors.has(block.id)) throw new Error(`guide: ancoră duplicată „${block.id}”`);
        anchors.add(block.id);
      }
    }
  }
}
