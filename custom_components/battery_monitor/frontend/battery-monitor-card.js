/**
 * battery-monitor-card — the batteries watched by the Battery Monitor integration:
 * icon, name, room and level, the lowest first; full screen, grouped by room or by battery type.
 * Served and added to the dashboard resources by the integration.
 * https://github.com/juju35/ha-battery-monitor
 */
var BATTERY_MONITOR_CARD_VERSION = '1.10.4';

const BM_I18N = {
  en: {
    title: 'Batteries',
    all_ok: 'All good',
    low_one: '{n} low',
    low_many: '{n} low',
    unavailable_one: '{n} unavailable',
    unavailable_many: '{n} unavailable',
    no_batteries: 'No battery found',
    not_loaded: 'Battery Monitor is not set up',
    low: 'Low',
    unavailable: 'Unavailable',
    notify_now: 'Notify now',
    notify_sent: 'Notification sent',
    notify_failed: 'Could not send the notification: {error}',
    notify_unavailable: 'The “Notify now” button is unavailable',
    since: 'low for {d}',
    since_unavailable: 'unavailable for {d}',
    hours: '{n} h',
    days: '{n} d',
    ed_entity: 'Battery Monitor sensor',
    ed_entity_helper: 'Leave empty to find it automatically',
    ed_title: 'Title',
    ed_title_helper: 'Leave empty for “Batteries”',
    ed_columns: 'Columns',
    ed_only_low: 'Hide the batteries that are fine',
    ed_only_low_helper: 'Only the batteries below the threshold or unavailable stay visible',
    ed_hide_when_ok: 'Hide the card when every battery is fine',
    ed_hide_when_ok_helper: 'The card only appears when a battery is below the threshold or unavailable',
    ed_notify_button: '“Notify now” button',
    ed_notify_button_helper: 'Sends the low-battery notification from the header',
    ed_language: 'Language',
    ed_language_helper: 'Leave empty to follow Home Assistant',
    ed_popup: 'Full screen button',
    ed_popup_helper: 'Opens every battery over the whole screen, by room or by battery type',
    ed_battery_models: 'Battery types by model',
    ed_battery_models_helper:
      'One type for every device of a model whose type is not detected (Battery Notes): pick it or type it, e.g. CR2450, 2× AA',
    ed_battery_types: 'Battery types by battery',
    ed_battery_types_helper: 'For a battery without a model, or one that differs from its model',
    devices_n: '{n} devices',
    devices_one: '1 device',
    popup_open: 'Full screen',
    popup_close: 'Close',
    by_room: 'By room',
    by_type: 'By battery type',
    no_area: 'No room',
    unknown_type: 'Unknown type',
    unknown_type_hint: 'Set the type in the card editor',
    rechargeable: 'Built-in rechargeable',
    count: '{n} batteries',
    count_one: '1 battery',
    cells: '{n} batteries',
    cells_one: '1 battery',
    to_check: '{n} to check',
    to_replace: 'To replace',
    nothing_to_replace: 'Nothing to replace',
  },
  fr: {
    title: 'Batteries',
    all_ok: 'Tout est bon',
    low_one: '{n} faible',
    low_many: '{n} faibles',
    unavailable_one: '{n} indisponible',
    unavailable_many: '{n} indisponibles',
    no_batteries: 'Aucune batterie trouvée',
    not_loaded: 'Battery Monitor n’est pas configuré',
    low: 'Faible',
    unavailable: 'Indisponible',
    notify_now: 'Notifier maintenant',
    notify_sent: 'Notification envoyée',
    notify_failed: 'Échec de l’envoi de la notification : {error}',
    notify_unavailable: 'Le bouton « Notifier maintenant » est indisponible',
    since: 'faible depuis {d}',
    since_unavailable: 'indisponible depuis {d}',
    hours: '{n} h',
    days: '{n} j',
    ed_entity: 'Capteur Battery Monitor',
    ed_entity_helper: 'Laisser vide pour le trouver automatiquement',
    ed_title: 'Titre',
    ed_title_helper: 'Laisser vide pour « Batteries »',
    ed_columns: 'Colonnes',
    ed_only_low: 'Masquer les batteries en bon état',
    ed_only_low_helper: 'Seules les batteries sous le seuil ou indisponibles restent affichées',
    ed_hide_when_ok: 'Masquer la carte si toutes les batteries vont bien',
    ed_hide_when_ok_helper: 'La carte n’apparaît que si une batterie est sous le seuil ou indisponible',
    ed_notify_button: 'Bouton « Notifier maintenant »',
    ed_notify_button_helper: 'Envoie la notification des batteries faibles depuis l’en-tête',
    ed_language: 'Langue',
    ed_language_helper: 'Laisser vide pour suivre Home Assistant',
    ed_popup: 'Bouton plein écran',
    ed_popup_helper: 'Affiche toutes les batteries sur tout l’écran, par pièce ou par type de pile',
    ed_battery_models: 'Types de pile par modèle',
    ed_battery_models_helper:
      'Un type pour tous les appareils d’un modèle dont le type n’est pas détecté (Battery Notes) : le choisir ou le saisir, ex. CR2450, 2× AA',
    ed_battery_types: 'Types de pile par batterie',
    ed_battery_types_helper: 'Pour une batterie sans modèle, ou qui diffère de son modèle',
    devices_n: '{n} appareils',
    devices_one: '1 appareil',
    popup_open: 'Plein écran',
    popup_close: 'Fermer',
    by_room: 'Par pièce',
    by_type: 'Par type de pile',
    no_area: 'Sans pièce',
    unknown_type: 'Type inconnu',
    unknown_type_hint: 'Définir le type dans l’éditeur de la carte',
    rechargeable: 'Batterie rechargeable intégrée',
    count: '{n} batteries',
    count_one: '1 batterie',
    cells: '{n} piles',
    cells_one: '1 pile',
    to_check: '{n} à vérifier',
    to_replace: 'À remplacer',
    nothing_to_replace: 'Rien à remplacer',
  },
  de: {
    title: 'Batterien',
    all_ok: 'Alles in Ordnung',
    low_one: '{n} schwach',
    low_many: '{n} schwach',
    unavailable_one: '{n} nicht verfügbar',
    unavailable_many: '{n} nicht verfügbar',
    no_batteries: 'Keine Batterie gefunden',
    not_loaded: 'Battery Monitor ist nicht eingerichtet',
    low: 'Schwach',
    unavailable: 'Nicht verfügbar',
    notify_now: 'Jetzt benachrichtigen',
    notify_sent: 'Benachrichtigung gesendet',
    notify_failed: 'Benachrichtigung konnte nicht gesendet werden: {error}',
    notify_unavailable: 'Die Schaltfläche „Jetzt benachrichtigen“ ist nicht verfügbar',
    since: 'schwach seit {d}',
    since_unavailable: 'nicht verfügbar seit {d}',
    hours: '{n} h',
    days: '{n} Tg.',
    ed_entity: 'Battery-Monitor-Sensor',
    ed_entity_helper: 'Leer lassen, um ihn automatisch zu finden',
    ed_title: 'Titel',
    ed_title_helper: 'Leer lassen für „Batterien“',
    ed_columns: 'Spalten',
    ed_only_low: 'Batterien in gutem Zustand ausblenden',
    ed_only_low_helper: 'Nur Batterien unter der Schwelle oder nicht verfügbare bleiben sichtbar',
    ed_hide_when_ok: 'Karte ausblenden, wenn alle Batterien in Ordnung sind',
    ed_hide_when_ok_helper: 'Die Karte erscheint nur, wenn eine Batterie unter der Schwelle oder nicht verfügbar ist',
    ed_notify_button: 'Schaltfläche „Jetzt benachrichtigen“',
    ed_notify_button_helper: 'Sendet die Benachrichtigung über schwache Batterien aus der Kopfzeile',
    ed_language: 'Sprache',
    ed_language_helper: 'Leer lassen, um Home Assistant zu folgen',
    ed_popup: 'Vollbild-Schaltfläche',
    ed_popup_helper: 'Zeigt alle Batterien im Vollbild, nach Raum oder nach Batterietyp',
    ed_battery_models: 'Batterietypen nach Modell',
    ed_battery_models_helper:
      'Ein Typ für alle Geräte eines Modells, dessen Typ nicht erkannt wird (Battery Notes): auswählen oder eingeben, z. B. CR2450, 2× AA',
    ed_battery_types: 'Batterietypen nach Batterie',
    ed_battery_types_helper: 'Für eine Batterie ohne Modell oder eine, die von ihrem Modell abweicht',
    devices_n: '{n} Geräte',
    devices_one: '1 Gerät',
    popup_open: 'Vollbild',
    popup_close: 'Schließen',
    by_room: 'Nach Raum',
    by_type: 'Nach Batterietyp',
    no_area: 'Kein Raum',
    unknown_type: 'Unbekannter Typ',
    unknown_type_hint: 'Lege den Typ im Karteneditor fest',
    rechargeable: 'Eingebauter Akku',
    count: '{n} Batterien',
    count_one: '1 Batterie',
    cells: '{n} Batterien',
    cells_one: '1 Batterie',
    to_check: '{n} zu prüfen',
    to_replace: 'Zu ersetzen',
    nothing_to_replace: 'Nichts zu ersetzen',
  },
  es: {
    title: 'Baterías',
    all_ok: 'Todo bien',
    low_one: '{n} baja',
    low_many: '{n} bajas',
    unavailable_one: '{n} no disponible',
    unavailable_many: '{n} no disponibles',
    no_batteries: 'No se encontró ninguna batería',
    not_loaded: 'Battery Monitor no está configurado',
    low: 'Baja',
    unavailable: 'No disponible',
    notify_now: 'Notificar ahora',
    notify_sent: 'Notificación enviada',
    notify_failed: 'No se pudo enviar la notificación: {error}',
    notify_unavailable: 'El botón «Notificar ahora» no está disponible',
    since: 'baja desde hace {d}',
    since_unavailable: 'no disponible desde hace {d}',
    hours: '{n} h',
    days: '{n} d',
    ed_entity: 'Sensor de Battery Monitor',
    ed_entity_helper: 'Déjalo vacío para encontrarlo automáticamente',
    ed_title: 'Título',
    ed_title_helper: 'Déjalo vacío para «Baterías»',
    ed_columns: 'Columnas',
    ed_only_low: 'Ocultar las baterías en buen estado',
    ed_only_low_helper: 'Solo siguen visibles las baterías por debajo del umbral o no disponibles',
    ed_hide_when_ok: 'Ocultar la tarjeta cuando todas las baterías estén bien',
    ed_hide_when_ok_helper: 'La tarjeta solo aparece cuando una batería está por debajo del umbral o no disponible',
    ed_notify_button: 'Botón «Notificar ahora»',
    ed_notify_button_helper: 'Envía la notificación de baterías bajas desde la cabecera',
    ed_language: 'Idioma',
    ed_language_helper: 'Déjalo vacío para seguir a Home Assistant',
    ed_popup: 'Botón de pantalla completa',
    ed_popup_helper: 'Muestra todas las baterías en pantalla completa, por habitación o por tipo de pila',
    ed_battery_models: 'Tipos de pila por modelo',
    ed_battery_models_helper:
      'Un tipo para todos los dispositivos de un modelo cuyo tipo no se detecta (Battery Notes): elígelo o escríbelo, p. ej. CR2450, 2× AA',
    ed_battery_types: 'Tipos de pila por batería',
    ed_battery_types_helper: 'Para una batería sin modelo, o que difiere de su modelo',
    devices_n: '{n} dispositivos',
    devices_one: '1 dispositivo',
    popup_open: 'Pantalla completa',
    popup_close: 'Cerrar',
    by_room: 'Por habitación',
    by_type: 'Por tipo de pila',
    no_area: 'Sin habitación',
    unknown_type: 'Tipo desconocido',
    unknown_type_hint: 'Define el tipo en el editor de la tarjeta',
    rechargeable: 'Batería recargable integrada',
    count: '{n} baterías',
    count_one: '1 batería',
    cells: '{n} pilas',
    cells_one: '1 pila',
    to_check: '{n} por revisar',
    to_replace: 'Por reemplazar',
    nothing_to_replace: 'Nada que reemplazar',
  },
  sr: {
    title: 'Батерије',
    all_ok: 'Све је у реду',
    low_one: '{n} слаба',
    low_many: 'Слабе: {n}',
    unavailable_one: '{n} недоступна',
    unavailable_many: 'Недоступне: {n}',
    no_batteries: 'Није пронађена ниједна батерија',
    not_loaded: 'Battery Monitor није подешен',
    low: 'Слаба',
    unavailable: 'Недоступна',
    notify_now: 'Обавести сада',
    notify_sent: 'Обавештење је послато',
    notify_failed: 'Слање обавештења није успело: {error}',
    notify_unavailable: 'Дугме „Обавести сада“ није доступно',
    since: 'слаба већ {d}',
    since_unavailable: 'недоступна већ {d}',
    hours: '{n} h',
    days: '{n} d',
    ed_entity: 'Battery Monitor сензор',
    ed_entity_helper: 'Остави празно за аутоматско проналажење',
    ed_title: 'Наслов',
    ed_title_helper: 'Остави празно за „Батерије“',
    ed_columns: 'Колоне',
    ed_only_low: 'Сакриј батерије које су у реду',
    ed_only_low_helper: 'Остаће видљиве само батерије испод прага или оне које су недоступне',
    ed_hide_when_ok: 'Сакриј картицу када су све батерије у реду',
    ed_hide_when_ok_helper: 'Картица се приказује само када је нека батерија испод прага или недоступна',
    ed_notify_button: 'Дугме „Обавести сада“',
    ed_notify_button_helper: 'Шаље обавештење о слабим батеријама из заглавља',
    ed_language: 'Језик',
    ed_language_helper: 'Остави празно да прати језик Home Assistant-а',
    ed_popup: 'Дугме за цео екран',
    ed_popup_helper: 'Отвара приказ свих батерија преко целог екрана, по просторијама или по типу батерије',
    ed_battery_models: 'Типови батерија по моделу',
    ed_battery_models_helper:
      'Један тип за сваки уређај модела чији тип није детектован (Battery Notes): изабери га или упиши, нпр. CR2450, 2× AA',
    ed_battery_types: 'Типови батерија појединачно',
    ed_battery_types_helper: 'За батерију која нема модел или се разликује од свог модела',
    devices_n: '{n} уређаја',
    devices_one: '1 уређај',
    popup_open: 'Цео екран',
    popup_close: 'Затвори',
    by_room: 'По просторији',
    by_type: 'По типу батерије',
    no_area: 'Без просторије',
    unknown_type: 'Непознат тип',
    unknown_type_hint: 'Подеси тип у едитору картице',
    rechargeable: 'Уграђена пуњива',
    count: 'Батерија: {n}',
    count_one: '1 батерија',
    cells: '{n} комада',
    cells_one: '1 комад',
    to_check: '{n} за проверу',
    to_replace: 'За замену',
    nothing_to_replace: 'Ништа за замену',
  },
  'sr-Latn': {
    title: 'Baterije',
    all_ok: 'Sve je u redu',
    low_one: '{n} slaba',
    low_many: 'Slabe: {n}',
    unavailable_one: '{n} nedostupna',
    unavailable_many: 'Nedostupne: {n}',
    no_batteries: 'Nije pronađena nijedna baterija',
    not_loaded: 'Battery Monitor nije podešen',
    low: 'Slaba',
    unavailable: 'Nedostupna',
    notify_now: 'Obavesti sada',
    notify_sent: 'Obaveštenje je poslato',
    notify_failed: 'Slanje obaveštenja nije uspelo: {error}',
    notify_unavailable: 'Dugme „Obavesti sada“ nije dostupno',
    since: 'slaba već {d}',
    since_unavailable: 'nedostupna već {d}',
    hours: '{n} h',
    days: '{n} d',
    ed_entity: 'Battery Monitor senzor',
    ed_entity_helper: 'Ostavi prazno za automatsko pronalaženje',
    ed_title: 'Naslov',
    ed_title_helper: 'Ostavi prazno za „Baterije“',
    ed_columns: 'Kolone',
    ed_only_low: 'Sakrij baterije koje su u redu',
    ed_only_low_helper: 'Ostaće vidljive samo baterije ispod praga ili one koje su nedostupne',
    ed_hide_when_ok: 'Sakrij karticu kada su sve baterije u redu',
    ed_hide_when_ok_helper: 'Kartica se prikazuje samo kada je neka baterija ispod praga ili nedostupna',
    ed_notify_button: 'Dugme „Obavesti sada“',
    ed_notify_button_helper: 'Šalje obaveštenje o slabim baterijama iz zaglavlja',
    ed_language: 'Jezik',
    ed_language_helper: 'Ostavi prazno da prati jezik Home Assistant-a',
    ed_popup: 'Dugme za ceo ekran',
    ed_popup_helper: 'Otvara prikaz svih baterija preko celog ekrana, po prostorijama ili po tipu baterije',
    ed_battery_models: 'Tipovi baterija po modelu',
    ed_battery_models_helper:
      'Jedan tip za svaki uređaj modela čiji tip nije detektovan (Battery Notes): izaberi ga ili upiši, npr. CR2450, 2× AA',
    ed_battery_types: 'Tipovi baterija pojedinačno',
    ed_battery_types_helper: 'Za bateriju koja nema model ili se razlikuje od svog modela',
    devices_n: '{n} uređaja',
    devices_one: '1 uređaj',
    popup_open: 'Ceo ekran',
    popup_close: 'Zatvori',
    by_room: 'Po prostoriji',
    by_type: 'Po tipu baterije',
    no_area: 'Bez prostorije',
    unknown_type: 'Nepoznat tip',
    unknown_type_hint: 'Podesi tip u editoru kartice',
    rechargeable: 'Ugrađena punjiva',
    count: 'Baterija: {n}',
    count_one: '1 baterija',
    cells: '{n} komada',
    cells_one: '1 komad',
    to_check: '{n} za proveru',
    to_replace: 'Za zamenu',
    nothing_to_replace: 'Ništa za zamenu',
  },
  it: {
    title: 'Batterie',
    all_ok: 'Tutto a posto',
    low_one: '{n} scarica',
    low_many: '{n} scariche',
    unavailable_one: '{n} non disponibile',
    unavailable_many: '{n} non disponibili',
    no_batteries: 'Nessuna batteria trovata',
    not_loaded: 'Battery Monitor non è configurato',
    low: 'Scarica',
    unavailable: 'Non disponibile',
    notify_now: 'Notifica ora',
    notify_sent: 'Notifica inviata',
    notify_failed: 'Impossibile inviare la notifica: {error}',
    notify_unavailable: 'Il pulsante «Notifica ora» non è disponibile',
    since: 'scarica da {d}',
    since_unavailable: 'non disponibile da {d}',
    hours: '{n} h',
    days: '{n} g',
    ed_entity: 'Sensore Battery Monitor',
    ed_entity_helper: 'Lascia vuoto per trovarlo automaticamente',
    ed_title: 'Titolo',
    ed_title_helper: 'Lascia vuoto per «Batterie»',
    ed_columns: 'Colonne',
    ed_only_low: 'Nascondi le batterie in buono stato',
    ed_only_low_helper: 'Restano visibili solo le batterie sotto la soglia o non disponibili',
    ed_hide_when_ok: 'Nascondi la scheda quando tutte le batterie sono a posto',
    ed_hide_when_ok_helper: 'La scheda appare solo quando una batteria è sotto la soglia o non disponibile',
    ed_notify_button: 'Pulsante «Notifica ora»',
    ed_notify_button_helper: 'Invia la notifica delle batterie scariche dall’intestazione',
    ed_language: 'Lingua',
    ed_language_helper: 'Lascia vuoto per seguire Home Assistant',
    ed_popup: 'Pulsante schermo intero',
    ed_popup_helper: 'Mostra tutte le batterie a schermo intero, per stanza o per tipo di batteria',
    ed_battery_models: 'Tipi di batteria per modello',
    ed_battery_models_helper:
      'Un tipo per tutti i dispositivi di un modello il cui tipo non viene rilevato (Battery Notes): sceglilo o digitalo, ad es. CR2450, 2× AA',
    ed_battery_types: 'Tipi di batteria per batteria',
    ed_battery_types_helper: 'Per una batteria senza modello, o diversa dal suo modello',
    devices_n: '{n} dispositivi',
    devices_one: '1 dispositivo',
    popup_open: 'Schermo intero',
    popup_close: 'Chiudi',
    by_room: 'Per stanza',
    by_type: 'Per tipo di batteria',
    no_area: 'Nessuna stanza',
    unknown_type: 'Tipo sconosciuto',
    unknown_type_hint: 'Imposta il tipo nell’editor della scheda',
    rechargeable: 'Ricaricabile integrata',
    count: '{n} batterie',
    count_one: '1 batteria',
    cells: '{n} pile',
    cells_one: '1 pila',
    to_check: '{n} da controllare',
    to_replace: 'Da sostituire',
    nothing_to_replace: 'Niente da sostituire',
  },
  nl: {
    title: 'Batterijen',
    all_ok: 'Alles in orde',
    low_one: '{n} laag',
    low_many: '{n} laag',
    unavailable_one: '{n} niet beschikbaar',
    unavailable_many: '{n} niet beschikbaar',
    no_batteries: 'Geen batterij gevonden',
    not_loaded: 'Battery Monitor is niet ingesteld',
    low: 'Laag',
    unavailable: 'Niet beschikbaar',
    notify_now: 'Nu melden',
    notify_sent: 'Melding verzonden',
    notify_failed: 'Kan de melding niet verzenden: {error}',
    notify_unavailable: 'De knop “Nu melden” is niet beschikbaar',
    since: 'al {d} laag',
    since_unavailable: 'al {d} niet beschikbaar',
    hours: '{n} u',
    days: '{n} d',
    ed_entity: 'Battery Monitor-sensor',
    ed_entity_helper: 'Leeg laten om hem automatisch te vinden',
    ed_title: 'Titel',
    ed_title_helper: 'Leeg laten voor “Batterijen”',
    ed_columns: 'Kolommen',
    ed_only_low: 'Batterijen verbergen die in orde zijn',
    ed_only_low_helper: 'Alleen batterijen onder de drempel of niet beschikbaar blijven zichtbaar',
    ed_hide_when_ok: 'Kaart verbergen als alle batterijen in orde zijn',
    ed_hide_when_ok_helper: 'De kaart verschijnt alleen als een batterij onder de drempel of niet beschikbaar is',
    ed_notify_button: 'Knop “Nu melden”',
    ed_notify_button_helper: 'Verstuurt de melding over bijna lege batterijen vanuit de koptekst',
    ed_language: 'Taal',
    ed_language_helper: 'Leeg laten om Home Assistant te volgen',
    ed_popup: 'Knop volledig scherm',
    ed_popup_helper: 'Toont alle batterijen over het hele scherm, per ruimte of per batterijtype',
    ed_battery_models: 'Batterijtypes per model',
    ed_battery_models_helper:
      'Eén type voor alle apparaten van een model waarvan het type niet wordt herkend (Battery Notes): kies of typ het, bijv. CR2450, 2× AA',
    ed_battery_types: 'Batterijtypes per batterij',
    ed_battery_types_helper: 'Voor een batterij zonder model, of die afwijkt van haar model',
    devices_n: '{n} apparaten',
    devices_one: '1 apparaat',
    popup_open: 'Volledig scherm',
    popup_close: 'Sluiten',
    by_room: 'Per ruimte',
    by_type: 'Per batterijtype',
    no_area: 'Geen ruimte',
    unknown_type: 'Onbekend type',
    unknown_type_hint: 'Stel het type in via de kaarteditor',
    rechargeable: 'Ingebouwd oplaadbaar',
    count: '{n} batterijen',
    count_one: '1 batterij',
    cells: '{n} batterijen',
    cells_one: '1 batterij',
    to_check: '{n} te controleren',
    to_replace: 'Te vervangen',
    nothing_to_replace: 'Niets te vervangen',
  },
  pt: {
    title: 'Baterias',
    all_ok: 'Tudo bem',
    low_one: '{n} fraca',
    low_many: '{n} fracas',
    unavailable_one: '{n} indisponível',
    unavailable_many: '{n} indisponíveis',
    no_batteries: 'Nenhuma bateria encontrada',
    not_loaded: 'O Battery Monitor não está configurado',
    low: 'Fraca',
    unavailable: 'Indisponível',
    notify_now: 'Notificar agora',
    notify_sent: 'Notificação enviada',
    notify_failed: 'Não foi possível enviar a notificação: {error}',
    notify_unavailable: 'O botão «Notificar agora» está indisponível',
    since: 'fraca há {d}',
    since_unavailable: 'indisponível há {d}',
    hours: '{n} h',
    days: '{n} d',
    ed_entity: 'Sensor Battery Monitor',
    ed_entity_helper: 'Deixe vazio para o encontrar automaticamente',
    ed_title: 'Título',
    ed_title_helper: 'Deixe vazio para «Baterias»',
    ed_columns: 'Colunas',
    ed_only_low: 'Ocultar as baterias em bom estado',
    ed_only_low_helper: 'Só ficam visíveis as baterias abaixo do limiar ou indisponíveis',
    ed_hide_when_ok: 'Ocultar o cartão quando todas as baterias estão bem',
    ed_hide_when_ok_helper: 'O cartão só aparece quando uma bateria está abaixo do limiar ou indisponível',
    ed_notify_button: 'Botão «Notificar agora»',
    ed_notify_button_helper: 'Envia a notificação de baterias fracas a partir do cabeçalho',
    ed_language: 'Idioma',
    ed_language_helper: 'Deixe vazio para seguir o Home Assistant',
    ed_popup: 'Botão de ecrã inteiro',
    ed_popup_helper: 'Mostra todas as baterias em ecrã inteiro, por divisão ou por tipo de pilha',
    ed_battery_models: 'Tipos de pilha por modelo',
    ed_battery_models_helper:
      'Um tipo para todos os dispositivos de um modelo cujo tipo não é detetado (Battery Notes): escolha-o ou escreva-o, p. ex. CR2450, 2× AA',
    ed_battery_types: 'Tipos de pilha por bateria',
    ed_battery_types_helper: 'Para uma bateria sem modelo, ou que difere do seu modelo',
    devices_n: '{n} dispositivos',
    devices_one: '1 dispositivo',
    popup_open: 'Ecrã inteiro',
    popup_close: 'Fechar',
    by_room: 'Por divisão',
    by_type: 'Por tipo de pilha',
    no_area: 'Sem divisão',
    unknown_type: 'Tipo desconhecido',
    unknown_type_hint: 'Defina o tipo no editor do cartão',
    rechargeable: 'Recarregável integrada',
    count: '{n} baterias',
    count_one: '1 bateria',
    cells: '{n} pilhas',
    cells_one: '1 pilha',
    to_check: '{n} a verificar',
    to_replace: 'A substituir',
    nothing_to_replace: 'Nada a substituir',
  },
  pl: {
    title: 'Baterie',
    all_ok: 'Wszystko w porządku',
    low_one: '{n} słaba',
    low_many: 'Słabe: {n}',
    unavailable_one: '{n} niedostępna',
    unavailable_many: 'Niedostępne: {n}',
    no_batteries: 'Nie znaleziono żadnej baterii',
    not_loaded: 'Battery Monitor nie jest skonfigurowany',
    low: 'Słaba',
    unavailable: 'Niedostępna',
    notify_now: 'Powiadom teraz',
    notify_sent: 'Powiadomienie wysłane',
    notify_failed: 'Nie udało się wysłać powiadomienia: {error}',
    notify_unavailable: 'Przycisk „Powiadom teraz” jest niedostępny',
    since: 'słaba od {d}',
    since_unavailable: 'niedostępna od {d}',
    hours: '{n} h',
    days: '{n} d',
    ed_entity: 'Czujnik Battery Monitor',
    ed_entity_helper: 'Pozostaw puste, aby znaleźć go automatycznie',
    ed_title: 'Tytuł',
    ed_title_helper: 'Pozostaw puste dla „Baterie”',
    ed_columns: 'Kolumny',
    ed_only_low: 'Ukryj baterie w dobrym stanie',
    ed_only_low_helper: 'Widoczne pozostają tylko baterie poniżej progu lub niedostępne',
    ed_hide_when_ok: 'Ukryj kartę, gdy wszystkie baterie są w porządku',
    ed_hide_when_ok_helper: 'Karta pojawia się tylko wtedy, gdy któraś bateria jest poniżej progu lub niedostępna',
    ed_notify_button: 'Przycisk „Powiadom teraz”',
    ed_notify_button_helper: 'Wysyła z nagłówka powiadomienie o słabych bateriach',
    ed_language: 'Język',
    ed_language_helper: 'Pozostaw puste, aby używać języka Home Assistant',
    ed_popup: 'Przycisk pełnego ekranu',
    ed_popup_helper: 'Wyświetla wszystkie baterie na całym ekranie, według pomieszczenia lub typu baterii',
    ed_battery_models: 'Typy baterii według modelu',
    ed_battery_models_helper:
      'Jeden typ dla wszystkich urządzeń modelu, którego typ nie został wykryty (Battery Notes): wybierz go lub wpisz, np. CR2450, 2× AA',
    ed_battery_types: 'Typy poszczególnych baterii',
    ed_battery_types_helper: 'Dla baterii bez modelu lub różniącej się od swojego modelu',
    devices_n: 'Urządzenia: {n}',
    devices_one: '1 urządzenie',
    popup_open: 'Pełny ekran',
    popup_close: 'Zamknij',
    by_room: 'Pomieszczenia',
    by_type: 'Typy baterii',
    no_area: 'Bez pomieszczenia',
    unknown_type: 'Nieznany typ',
    unknown_type_hint: 'Ustaw typ w edytorze karty',
    rechargeable: 'Wbudowany akumulator',
    count: 'Baterie: {n}',
    count_one: '1 bateria',
    cells: 'Baterie: {n}',
    cells_one: '1 bateria',
    to_check: 'Do sprawdzenia: {n}',
    to_replace: 'Do wymiany',
    nothing_to_replace: 'Nic do wymiany',
  },
};

const bmLang = (hass, config) => {
  const raw = String(config?.language || hass?.locale?.language || hass?.language || 'en');
  // Exact code first (sr-Latn, Serbian in Latin script), then the part before the dash (fr-FR → fr, pt-BR → pt).
  if (BM_I18N[raw]) return raw;
  const l = raw.split('-')[0].toLowerCase();
  return BM_I18N[l] ? l : 'en';
};

// A Home Assistant dialog (a more-info…) is open: its history entry is the current one.
const bmDialogOpen = () => {
  const state = globalThis.window?.history?.state;
  return !!state?.dialog && state.open !== false;
};

const bmT = (lang, key, vars = {}) =>
  (BM_I18N[lang]?.[key] ?? BM_I18N.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

const bmEsc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const BM_DEFAULTS = { columns: 1, only_low: false, hide_when_ok: false, notify_button: true, popup: true };

// ── Battery types ────────────────────────────────────────────────────────────
// The type comes from the card's `battery_types` (set in the editor), else from Battery Notes: the `battery_type` /
// `battery_quantity` attributes of the battery entity, or its "Battery type" sensor on the same device.
// "2× AA", "2x AA" or "AA x2" read as 2 AA batteries.
const BM_TYPES = ['CR2032', 'CR2450', 'CR2477', 'CR2016', 'CR2025', 'CR1632', 'CR123A', 'CR2', 'AA', 'AAA', '2× AA',
  '2× AAA', '3× AA', '3× AAA', '4× AA', 'LR44', '9V', '18650', 'ER14505', 'rechargeable'];

function bmParseType(value, quantity) {
  const s = String(value ?? '').trim();
  if (!s || s === 'unknown' || s === 'unavailable') return null;
  const m = /^(\d+)\s*[x×]\s*(.+)$/i.exec(s) || /^(.+?)\s*[x×]\s*(\d+)$/i.exec(s);
  if (m) {
    const [n, type] = /^\d+$/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
    return { type: type.trim(), quantity: Number(n) };
  }
  const q = Number(quantity);
  return { type: s, quantity: Number.isFinite(q) && q > 0 ? q : 1 };
}

// Battery Notes' "Battery type" sensors, by device, built once per entity registry object.
const bmTypeSensors = new WeakMap();
function bmTypeSensorOf(registry, deviceId) {
  if (!registry || !deviceId) return undefined;
  let index = bmTypeSensors.get(registry);
  if (!index) {
    index = new Map();
    for (const [id, e] of Object.entries(registry)) {
      if (e?.device_id && id.startsWith('sensor.') && (e.translation_key === 'battery_type' || /_battery_type$/.test(id))) {
        index.set(e.device_id, id);
      }
    }
    bmTypeSensors.set(registry, index);
  }
  return index.get(deviceId);
}

// The detected type of a battery (without the card's own setting), or null.
function bmDetectedType(hass, b) {
  const a = hass?.states?.[b.entity_id]?.attributes || {};
  if (a.battery_type) return bmParseType(a.battery_type, a.battery_quantity);
  const sensor = hass?.states?.[bmTypeSensorOf(hass?.entities, b.device_id)];
  return sensor ? bmParseType(sensor.state, sensor.attributes?.battery_quantity) : null;
}

// The icon of a room, from the area registry (the battery list names its area): the area's own icon, else a door,
// and a house for the batteries without a room.
function bmAreaIcon(hass, name) {
  if (!name) return 'mdi:home-outline';
  const area = Object.values(hass?.areas || {}).find((a) => a?.name === name);
  return area?.icon || 'mdi:door-open';
}

// The model of a battery's device ("Hue dimmer switch", "MYGGBETT door/window sensor"), from the device registry.
const bmModelOf = (hass, b) => String(hass?.devices?.[b.device_id]?.model || '').trim();

// The type of a battery: set for this battery in the card, else set for its model, else detected.
const bmTypeOf = (hass, config, b) => {
  const set = config?.battery_types?.[b.entity_id] || config?.battery_models?.[bmModelOf(hass, b)];
  return set ? bmParseType(set) : bmDetectedType(hass, b);
};

// A selector that finds a focused control of the full screen again once its markup is written anew: a battery,
// a tab, or a button by its class.
function bmFocusKey(el) {
  if (!el) return null;
  const quote = (v) => `"${String(v).replace(/["\\]/g, '\\$&')}"`;
  if (el.dataset?.id) return `[data-id=${quote(el.dataset.id)}]`;
  if (el.dataset?.view) return `[data-view=${quote(el.dataset.view)}]`;
  const cls = el.classList?.[0];
  return cls ? `.${cls}` : null;
}

// The integration's sensors, from the entity registry.
const bmCandidates = (registry) =>
  Object.keys(registry || {}).filter((id) => id.startsWith('sensor.') && registry[id]?.platform === 'battery_monitor');

// The integration's "Low batteries" sensor: the candidate whose state carries the battery list right now.
const bmPick = (hass, candidates) => candidates.find((id) => Array.isArray(hass?.states?.[id]?.attributes?.batteries));

// The "Notify now" button of the sensor's device.
const bmFindButton = (registry, entity) => {
  const device = entity && registry?.[entity]?.device_id;
  return device
    ? Object.keys(registry).find((id) => id.startsWith('button.') && registry[id].device_id === device)
    : undefined;
};

class BatteryMonitorCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('battery-monitor-card-editor');
  }

  static getStubConfig() {
    return {};
  }

  setConfig(config) {
    this._config = { ...BM_DEFAULTS, ...config };
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._sig = null;
    this._render();
  }

  set hass(hass) {
    const old = this._hass;
    this._hass = hass;
    // Cheap short-circuit before rebuilding the whole signature: the sensor's state object, the registries (areas: room icons),
    // the language and the hour bucket ("low for X h") are unchanged, so nothing the card shows can have
    // changed. A Battery Notes type edit alone waits for the next sensor update or hour at worst.
    const entity = this._state?.entity;
    if (
      old &&
      this._sig &&
      entity &&
      hass.states[entity] === old.states[entity] &&
      hass.states[this._state.button] === old.states[this._state.button] &&
      hass.entities === old.entities &&
      hass.devices === old.devices &&
      hass.areas === old.areas &&
      bmLang(hass, this._config) === bmLang(old, this._config) &&
      Math.floor(Date.now() / 3600000) === this._sigHour
    ) {
      return;
    }
    this._render();
  }

  disconnectedCallback() {
    // A dashboard edit can simply move the card in the DOM: only close the full screen if the card is really gone.
    Promise.resolve().then(() => {
      if (this.isConnected) return;
      this._closePopup();
      clearTimeout(this._notifyTimer);
      this._notifyState = null;
    });
  }

  getCardSize() {
    return 1 + Math.ceil((this._shown || 1) / (this._config?.columns || 1));
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: 'auto' };
  }

  _t(key, vars) {
    return bmT(bmLang(this._hass, this._config), key, vars);
  }

  _since(iso, key) {
    const h = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3600000);
    // "< 1 h" the first hour, hours up to two days, days beyond.
    const d = h < 1 ? this._t('hours', { n: '< 1' }) : h < 48 ? this._t('hours', { n: Math.floor(h) }) : this._t('days', { n: Math.floor(h / 24) });
    return this._t(key, { d });
  }

  // The sensor and the "Notify now" button of its device. What comes from the entity registry (the integration's
  // sensors, each sensor's button) is kept until hass.entities changes; the states are read again at each call, so a
  // sensor missing, restored or without its battery list at the first render is found as soon as its state is there.
  // An empty registry result is never kept.
  _lookup() {
    const registry = this._hass.entities;
    if (!this._reg || this._reg.registry !== registry) this._reg = { registry, candidates: null, buttons: {} };
    const reg = this._reg;
    let entity = this._config.entity;
    if (!entity) {
      const candidates = reg.candidates || bmCandidates(registry);
      if (candidates.length) reg.candidates = candidates;
      entity = bmPick(this._hass, candidates);
    }
    if (!entity) return {};
    if (!(entity in reg.buttons)) {
      const button = bmFindButton(registry, entity);
      // No button is kept only once the registry knows the sensor (otherwise it may just not be loaded yet).
      if (!button && !registry?.[entity]) return { entity };
      reg.buttons[entity] = button;
    }
    return { entity, button: reg.buttons[entity] };
  }

  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    const c = this._config;
    const { entity, button } = this._lookup();
    const st = entity && this._hass.states[entity];
    const all = st?.attributes.batteries || [];
    const low = all.filter((b) => b.low);
    const unavailable = all.filter((b) => b.unavailable);
    const attention = low.length + unavailable.length;
    const due = all.filter((b) => b.due);
    const shown = c.only_low ? all.filter((b) => b.low || b.unavailable) : all;
    this._shown = shown.length;

    // The current hour too: "low for X h" is computed from the clock, while below_since doesn't change.
    // The battery types read from Battery Notes, which may change without the battery list changing.
    const types = all.map((b) => bmTypeOf(this._hass, c, b));
    // The room icons of the full screen, which an area edit alone changes.
    const icons = [...new Set(all.map((b) => b.area))].map((a) => bmAreaIcon(this._hass, a));
    const hour = Math.floor(Date.now() / 3600000);
    // The button's availability too: an unavailable "Notify now" button is disabled.
    const buttonUnavailable = this._hass.states?.[button]?.state === 'unavailable';
    const sig = JSON.stringify([c, bmLang(this._hass, c), entity, st?.state, all, types, icons, button, buttonUnavailable, hour]);
    this._sigHour = hour;
    if (sig === this._sig) return;
    this._sig = sig;
    this._state = { entity, button, all, low, unavailable, due, attention };
    if (this._popup) this._renderPopup();

    const hidden = c.hide_when_ok && st && !attention;
    this.style.display = hidden ? 'none' : '';
    if (hidden) return;

    const level = this._level();
    const counts = [
      low.length ? this._t(low.length > 1 ? 'low_many' : 'low_one', { n: low.length }) : '',
      unavailable.length
        ? this._t(unavailable.length > 1 ? 'unavailable_many' : 'unavailable_one', { n: unavailable.length })
        : '',
    ].filter(Boolean);
    const status = this._status(st, counts, all);
    const cols = Math.min(3, Math.max(1, Number(c.columns) || 1));

    // The room and the battery type (CR2032, 2× AA…) under each name, when known.
    const rows = shown
      .map((b) => this._row(b, [b.area, this._typeLabel(bmTypeOf(this._hass, c, b))].filter(Boolean).join(' · ')))
      .join('');

    this.shadowRoot.innerHTML = `
      <style>${BatteryMonitorCard.styles}</style>
      <ha-card class="lvl-${level}">
        <div class="head">
          <div class="badge"><ha-icon icon="${level === 'ok' ? 'mdi:battery-check-outline' : 'mdi:battery-alert-variant-outline'}"></ha-icon></div>
          ${this._headMain(c.title || this._t('title'), status)}
          ${
            c.popup !== false && st
              ? `<button class="full" title="${bmEsc(this._t('popup_open'))}" aria-label="${bmEsc(this._t('popup_open'))}"><ha-icon icon="mdi:fullscreen"></ha-icon></button>`
              : ''
          }
        </div>
        ${rows ? `<div class="list" style="--cols:${cols}">${rows}</div>` : ''}
      </ha-card>`;

    this.shadowRoot.querySelector('.notify')?.addEventListener('click', () => this._notify());
    this.shadowRoot.querySelector('.full')?.addEventListener('click', () => this._openPopup());
    for (const el of this.shadowRoot.querySelectorAll('.row')) el.addEventListener('click', () => this._moreInfo(el.dataset.id));
  }

  // 'alert' when a battery is due, 'warn' when one needs attention, else 'ok'.
  _level() {
    const s = this._state;
    return s.due.length ? 'alert' : s.attention ? 'warn' : 'ok';
  }

  _status(st, counts, all) {
    if (!st) return this._t('not_loaded');
    return counts.length ? counts.join(' · ') : this._t(all.length ? 'all_ok' : 'no_batteries');
  }

  // The title, the "Notify now" button and the status pill, in a block of their own between the badge and the full
  // screen (or close) button: short of room on one line, the pill goes under the title, whole, rather than being cut.
  _headMain(title, status) {
    return `<div class="main"><div class="title">${bmEsc(title)}</div>${this._notifyButton()}${this._pill(status)}</div>`;
  }

  // The status pill: its whole text, on its own line under the title when the header is short of room.
  _pill(status) {
    const text = bmEsc(status);
    return `<div class="pill" title="${text}"><span class="pt">${text}</span></div>`;
  }

  // The "Notify now" button's look: its state while a press runs ('busy'), just after ('done'), or when it failed
  // ('error'); disabled while the button entity is unavailable.
  _notifyLook() {
    const unavailable = this._hass?.states?.[this._state?.button]?.state === 'unavailable';
    const state = unavailable ? '' : this._notifyState || '';
    const label = unavailable
      ? this._t('notify_unavailable')
      : state === 'done'
        ? this._t('notify_sent')
        : state === 'error'
          ? this._t('notify_failed', { error: this._notifyError })
          : this._t('notify_now');
    const icon = { busy: 'mdi:loading', done: 'mdi:check', error: 'mdi:alert-circle-outline' }[state] || 'mdi:bell-ring-outline';
    return { unavailable, state, label, icon };
  }

  _notifyButton() {
    if (!this._config.notify_button || !this._state?.button) return '';
    const { unavailable, state, label, icon } = this._notifyLook();
    const l = bmEsc(label);
    return `<button class="notify" data-state="${state}" title="${l}" aria-label="${l}"${unavailable ? ' disabled' : ''}${state === 'busy' ? ' aria-busy="true"' : ''}><ha-icon icon="${icon}"></ha-icon></button>`;
  }

  // Shows the press state on the buttons already there (the card's and the full screen's), without writing the
  // markup again: a button focused from the keyboard keeps its focus.
  _setNotify(state, error = '') {
    this._notifyState = state;
    this._notifyError = error;
    const { unavailable, state: shown, label, icon } = this._notifyLook();
    for (const root of [this.shadowRoot, this._popup?.shadowRoot]) {
      for (const el of root?.querySelectorAll?.('.notify') || []) {
        if (el.dataset) el.dataset.state = shown;
        el.title = label;
        el.setAttribute?.('aria-label', label);
        if (shown === 'busy') el.setAttribute?.('aria-busy', 'true');
        else el.removeAttribute?.('aria-busy');
        el.toggleAttribute?.('disabled', unavailable);
        el.querySelector?.('ha-icon')?.setAttribute('icon', icon);
      }
    }
  }

  // Presses the "Notify now" button: busy while the call runs, a check mark once sent, the reason in the tooltip
  // when it fails. A press while one runs, or on an unavailable button, does nothing.
  async _notify() {
    const button = this._state?.button;
    if (!button || this._notifyState === 'busy' || this._notifyLook().unavailable) return;
    clearTimeout(this._notifyTimer);
    this._setNotify('busy');
    let state = 'done';
    let error = '';
    try {
      await this._hass.callService('button', 'press', { entity_id: button });
    } catch (err) {
      state = 'error';
      error = String(err?.message || err?.code || err || '');
    }
    this._setNotify(state, error);
    this._notifyTimer = setTimeout(() => this._setNotify(null), state === 'done' ? 2000 : 8000);
  }

  _moreInfo(entityId) {
    const ev = new Event('hass-more-info', { bubbles: true, composed: true });
    ev.detail = { entityId };
    this.dispatchEvent(ev);
  }

  // The battery type with how many it takes: "1× CR2032", "4× AA"; a built-in rechargeable battery has no count.
  _typeLabel(t, withCount = true) {
    if (!t) return '';
    if (t.type === 'rechargeable') return this._t('rechargeable');
    return withCount ? `${t.quantity || 1}× ${t.type}` : t.type;
  }

  // One battery: `context` (its room, or its type) then how long it has needed attention, under its name.
  _row(b, context) {
    // A low battery is a warning; an unavailable one (often a dead one, shown with its own icon) or one due for
    // replacement is an alert.
    const kind = `${b.unavailable || b.due ? 'alert' : b.low ? 'warn' : 'ok'}${b.unavailable ? ' na' : ''}${b.due ? ' due' : ''}`;
    const value = b.unavailable ? this._t('unavailable') : b.level == null ? this._t('low') : `${b.level} %`;
    const since = b.below_since ? this._since(b.below_since, b.unavailable ? 'since_unavailable' : 'since') : null;
    const sub = [context, since].filter(Boolean).join(' · ');
    const bar = b.level == null ? '' : `<span class="bar" style="width:${Math.max(2, Math.min(100, b.level))}%"></span>`;
    return `
          <button class="row ${kind}" data-id="${bmEsc(b.entity_id)}" title="${bmEsc(b.name)} — ${bmEsc(value)}">
            <span class="ic"><ha-icon icon="${bmEsc(b.icon)}"></ha-icon></span>
            <span class="txt">
              <span class="name">${bmEsc(b.name)}</span>
              ${sub ? `<span class="sub">${bmEsc(sub)}</span>` : ''}
            </span>
            <span class="lvl">${bmEsc(value)}${bar ? `<span class="track">${bar}</span>` : ''}</span>
          </button>`;
  }

  // ── Full screen ──
  // Every battery over the whole screen, grouped by room or by battery type, with what to buy for the ones to
  // replace. Appended to the page's body so that no dashboard container clips it; closes with its button, Escape,
  // a click outside or the back button.
  _openPopup() {
    if (this._popup?.isConnected) return;
    if (this._popup) this._closePopup(true);
    const host = document.createElement('div');
    host.className = 'battery-monitor-popup';
    const root = host.attachShadow({ mode: 'open' });
    root.addEventListener('click', (ev) => this._onPopupClick(ev));
    this._onPopupKey = (ev) => {
      // Escape over a more-info opened from here closes that dialog only, and Tab moves in that dialog.
      if (bmDialogOpen()) return;
      if (ev.key === 'Escape') this._closePopup();
      else if (ev.key === 'Tab') this._trapTab(ev);
    };
    this._onPopupBack = (ev) => {
      // A more-info opened from a row adds its own history entry; closing it goes back to the popup's entry:
      // stay open. Our own flag tells that case apart: older versions of Home Assistant leave a closed-dialog
      // state on the dashboard's entry after any more-info opened from the dashboard, so the state alone cannot.
      // The state still has to be the popup's entry (ours, or the dialog state older versions put on it), in case
      // no more-info opened at all.
      const state = ev?.state;
      const opened = this._moreInfoOpen;
      this._moreInfoOpen = false;
      if (opened && (state?.batteryMonitorPopup || state?.dialog)) {
        this._popupLayer(false);
        return;
      }
      this._closePopup(true);
    };
    document.addEventListener('keydown', this._onPopupKey);
    window.addEventListener?.('popstate', this._onPopupBack);
    window.history?.pushState?.({ batteryMonitorPopup: true }, '');
    // Our own flag: a more-info may rewrite history.state, which then no longer tells whether to go back.
    this._popupHistory = !!window.history?.pushState;
    // The page the popup's entry belongs to: once the user has navigated elsewhere (a device link in a more-info
    // opened from here), going back would undo that navigation.
    this._popupUrl = window.location?.href;
    this._bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.appendChild(host);
    this._popup = host;
    this._view ||= 'room';
    this._renderPopup();
    // The keyboard goes with the dialog: its close button first.
    root.querySelector('.close')?.focus?.({ preventScroll: true });
  }

  // Tab from the last control goes back to the first one, Shift+Tab from the first to the last: the focus never
  // leaves for the dashboard hidden behind the full screen.
  _trapTab(ev) {
    const root = this._popup?.shadowRoot;
    const items = [...(root?.querySelectorAll?.('button:not([disabled])') || [])];
    if (!items.length) return;
    const at = items.indexOf(root.activeElement);
    const next = ev.shiftKey ? (at <= 0 ? items[items.length - 1] : null) : at < 0 || at === items.length - 1 ? items[0] : null;
    if (!next) return;
    ev.preventDefault();
    next.focus();
  }

  // `fromBack`: the back button already left the history entry the popup added.
  _closePopup(fromBack = false) {
    if (!this._popup) return;
    const host = this._popup;
    this._popup = null;
    this._moreInfoOpen = false;
    host.remove();
    document.removeEventListener('keydown', this._onPopupKey);
    window.removeEventListener?.('popstate', this._onPopupBack);
    document.body.style.overflow = this._bodyOverflow || '';
    const pushed = this._popupHistory && window.location?.href === this._popupUrl;
    this._popupHistory = false;
    this._popupUrl = null;
    if (!fromBack && pushed) window.history.back();
    // The focus back on the button that opened it.
    this.shadowRoot?.querySelector?.('.full')?.focus?.({ preventScroll: true });
  }

  // Home Assistant's dialogs are not in the browser's top layer: while a more-info opened from the full screen
  // is shown, the layer drops below them (their z-index is 7-8), and comes back on top once it is closed.
  _popupLayer(under) {
    this._popup?.style.setProperty?.('--bm-layer', under ? '5' : '9999');
  }

  _onPopupClick(ev) {
    const path = ev.composedPath();
    const el = path.find((n) => n.classList && (n.dataset?.id || n.dataset?.view || n.classList.contains('close') || n.classList.contains('notify')));
    if (!el) {
      if (!path.some((n) => n.classList?.contains?.('sheet'))) this._closePopup();
      return;
    }
    if (el.classList.contains('close')) this._closePopup();
    else if (el.classList.contains('notify')) this._notify();
    else if (el.dataset.view) {
      this._view = el.dataset.view;
      this._renderPopup();
    } else if (el.dataset.id) {
      this._popupLayer(true);
      this._moreInfoOpen = true;
      this._moreInfo(el.dataset.id);
    }
  }

  // The batteries in groups: [{ key, name, icon, hint, items: [{ b, context }] }], by room or by type.
  _groups(view) {
    const map = new Map();
    for (const b of this._state.all) {
      const t = bmTypeOf(this._hass, this._config, b);
      const key = view === 'room' ? b.area || '' : t?.type || '';
      if (!map.has(key)) map.set(key, []);
      // By type, the group names the type: each battery tells its room and how many it takes.
      const count = t && t.type !== 'rechargeable' ? this._t(t.quantity > 1 ? 'cells' : 'cells_one', { n: t.quantity }) : '';
      map.get(key).push({ b, cells: t?.quantity || 1, context: view === 'room' ? this._typeLabel(t) : [b.area, count].filter(Boolean).join(' · ') });
    }
    const groups = [...map.entries()].map(([key, items]) => ({
      key,
      items,
      name: key
        ? view === 'type' && key === 'rechargeable'
          ? this._t('rechargeable')
          : key
        : this._t(view === 'room' ? 'no_area' : 'unknown_type'),
      icon: view === 'room' ? bmAreaIcon(this._hass, key) : key ? 'mdi:battery-outline' : 'mdi:battery-unknown',
      hint: view === 'type' && !key ? this._t('unknown_type_hint') : '',
      // By type, the batteries of that type in all (a remote with 2 AAA counts 2); by room, the devices.
      cells: view === 'type' && key && key !== 'rechargeable' ? items.reduce((n, x) => n + x.cells, 0) : null,
    }));
    // Rooms by name, types by how many batteries use them; the room-less and the unknown last.
    return groups.sort((a, b) => !a.key - !b.key || (view === 'type' ? b.items.length - a.items.length : 0) || a.name.localeCompare(b.name));
  }

  _groupCount(g) {
    if (g.cells != null) return this._t(g.cells > 1 ? 'cells' : 'cells_one', { n: g.cells });
    return g.items.length > 1 ? this._t('count', { n: g.items.length }) : this._t('count_one');
  }

  // What to buy: the types of the batteries needing attention, with how many of each.
  _toReplace() {
    const need = new Map();
    for (const b of this._state.all.filter((x) => x.low || x.unavailable)) {
      const t = bmTypeOf(this._hass, this._config, b);
      const key = t?.type || '';
      need.set(key, (need.get(key) || 0) + (t?.quantity || 1));
    }
    return [...need.entries()]
      .sort((a, b) => !a[0] - !b[0] || b[1] - a[1])
      .map(([type, n]) => `<span class="buy${type ? '' : ' unknown'}"><b>${n}×</b> ${bmEsc(type ? this._typeLabel({ type }, false) : this._t('unknown_type'))}</span>`)
      .join('');
  }

  _renderPopup() {
    const host = this._popup;
    if (!host || !this._state) return;
    const c = this._config;
    const s = this._state;
    const level = this._level();
    const counts = [
      s.low.length ? this._t(s.low.length > 1 ? 'low_many' : 'low_one', { n: s.low.length }) : '',
      s.unavailable.length ? this._t(s.unavailable.length > 1 ? 'unavailable_many' : 'unavailable_one', { n: s.unavailable.length }) : '',
    ].filter(Boolean);
    const status = this._status(true, counts, s.all);
    const view = this._view;
    const groups = this._groups(view)
      .map((g) => {
        const alerts = g.items.filter(({ b }) => b.low || b.unavailable).length;
        return `
        <section class="group${alerts ? ' attention' : ''}">
          <div class="ghead"><ha-icon icon="${bmEsc(g.icon)}"></ha-icon><span class="gname">${bmEsc(g.name)}</span>
            ${alerts ? `<span class="gchip">${bmEsc(this._t('to_check', { n: alerts }))}</span>` : ''}
            <span class="gcount">${bmEsc(this._groupCount(g))}</span></div>
          ${g.hint ? `<div class="ghint">${bmEsc(g.hint)}</div>` : ''}
          <div class="glist">${g.items.map(({ b, context }) => this._row(b, context)).join('')}</div>
        </section>`;
      })
      .join('');
    const buy = this._toReplace();
    const tab = (v) =>
      `<button class="tab${view === v ? ' on' : ''}" data-view="${v}" aria-pressed="${view === v}">${bmEsc(this._t(v === 'room' ? 'by_room' : 'by_type'))}</button>`;
    const title = bmEsc(c.title || this._t('title'));
    // A refresh while the user is reading (a battery change, the hour ticking) keeps their scroll position;
    // switching tabs starts back at the top.
    const scrolled = (view === this._renderedView && host.shadowRoot.querySelector('.sheet')?.scrollTop) || 0;
    this._renderedView = view;
    // The focused control (a tab, a battery, a button) is found again in the new markup.
    const focused = bmFocusKey(host.shadowRoot.activeElement);
    host.shadowRoot.innerHTML = `
      <style>${BatteryMonitorCard.styles}${BatteryMonitorCard.popupStyles}</style>
      <div class="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="${title}">
        <ha-card class="popup lvl-${level}">
          <div class="head">
            <div class="badge"><ha-icon icon="${level === 'ok' ? 'mdi:battery-check-outline' : 'mdi:battery-alert-variant-outline'}"></ha-icon></div>
            ${this._headMain(c.title || this._t('title'), status)}
            <button class="close" title="${bmEsc(this._t('popup_close'))}" aria-label="${bmEsc(this._t('popup_close'))}"><ha-icon icon="mdi:close"></ha-icon></button>
          </div>
          <div class="bar-top">
            <div class="tabs" role="group">${tab('room')}${tab('type')}</div>
            <div class="replace"><span class="rlabel"><ha-icon icon="mdi:cart-outline"></ha-icon>${bmEsc(this._t('to_replace'))}</span>${buy || `<span class="none">${bmEsc(this._t('nothing_to_replace'))}</span>`}</div>
          </div>
          <div class="groups">${groups}</div>
        </ha-card>
      </div></div>`;
    if (scrolled) {
      const sheet = host.shadowRoot.querySelector('.sheet');
      if (sheet) sheet.scrollTop = scrolled;
    }
    if (focused) host.shadowRoot.querySelector(focused)?.focus?.({ preventScroll: true });
  }

  static get styles() {
    return `
      /* A block, never narrower than its grid or flex track (min-width: 0): see the size container below. */
      :host {
        display: block;
        min-width: 0;
        --bm-ok: var(--success-color, #43a047);
        --bm-warn: var(--warning-color, #ffa600);
        --bm-alert: var(--error-color, #db4437);
        --bm-na: var(--disabled-color, #9e9e9e);
        /* Text in a status colour: the colour mixed with the theme's text, darker in light themes and lighter in dark
           ones, so that it stays readable (4.5:1) on its tinted background. Badges, icons and bars keep the plain colour. */
        --bm-ok-text: color-mix(in srgb, var(--bm-ok) 40%, var(--primary-text-color, #212121));
        --bm-warn-text: color-mix(in srgb, var(--bm-warn) 40%, var(--primary-text-color, #212121));
        --bm-alert-text: color-mix(in srgb, var(--bm-alert) 40%, var(--primary-text-color, #212121));
        --bm-primary-text: color-mix(in srgb, var(--primary-color, #03a9f4) 40%, var(--primary-text-color, #212121));
      }
      /* The card is a size container: the header and the list adapt to its own width (the Sections view's columns).
         A size container takes no width from its content: in a parent sized by its content (inline-block, an \`auto\`
         grid column of layout-card) it would shrink to its padding, hence a width of its own there. */
      ha-card { padding: 12px; overflow: hidden; container-type: inline-size; contain-intrinsic-inline-size: 240px; }
      ha-card.lvl-ok    { --c: var(--bm-ok); --ct: var(--bm-ok-text); }
      ha-card.lvl-warn  { --c: var(--bm-warn); --ct: var(--bm-warn-text); }
      ha-card.lvl-alert { --c: var(--bm-alert); --ct: var(--bm-alert-text); }

      /* Short of room on one line, the pill goes under the title (its text wrapping if it is longer than the line);
         the title keeps a few letters, the icon buttons never shrink. */
      .head { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .main { flex: 1 1 0; min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
      .badge { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
               background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
      .badge ha-icon { --mdc-icon-size: 24px; }
      .title { flex: 1 1 0; min-width: min(100%, 8ch); font-size: 16px; font-weight: 500; color: var(--primary-text-color);
               white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .pill { flex: 0 1 auto; min-width: 0; max-width: 100%; overflow-wrap: anywhere;
              box-sizing: border-box; font-size: 11px; font-weight: 500; padding: 1px 8px; border-radius: 9px;
              color: var(--ct); background: color-mix(in srgb, var(--c) 14%, transparent); }
      .pt { display: block; }
      .notify { all: unset; cursor: pointer; flex: none; width: 26px; height: 26px; border-radius: 50%;
                display: grid; place-items: center; color: var(--secondary-text-color); }
      .notify:hover { background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); }
      .notify:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      .notify ha-icon { --mdc-icon-size: 16px; }
      .notify[data-state='busy'] { cursor: progress; }
      .notify[data-state='busy'] ha-icon { animation: bm-spin 1s linear infinite; }
      .notify[data-state='done'] { color: var(--bm-ok-text); }
      .notify[data-state='error'] { color: var(--bm-alert-text); }
      .notify:disabled { cursor: default; opacity: .4; }
      .notify:disabled:hover { background: none; }
      .full { all: unset; cursor: pointer; flex: none; width: 24px; height: 24px; margin: -4px -4px -4px 0; border-radius: 50%;
              display: grid; place-items: center; color: var(--secondary-text-color); }
      .full:hover { background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); color: var(--primary-text-color); }
      .full:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      .full ha-icon { --mdc-icon-size: 16px; }

      /* Up to --cols columns, each at least 160px wide (or the whole card, if narrower): fewer columns when they do not fit */
      .list { display: grid; gap: 6px; margin-top: 8px;
              grid-template-columns: repeat(auto-fill, minmax(min(100%, max(160px, (100% - (var(--cols) - 1) * 6px) / var(--cols) - 0.5px)), 1fr)); }
      .row { --t: var(--bm-ok); --tt: var(--bm-ok-text); all: unset; box-sizing: border-box; cursor: pointer; min-width: 0;
             display: flex; align-items: center; gap: 8px; padding: 5px 10px 5px 5px; border-radius: 10px;
             background: var(--secondary-background-color, rgba(127,127,127,.08)); }
      .row.warn  { --t: var(--bm-warn); --tt: var(--bm-warn-text); }
      .row.alert  { --t: var(--bm-alert); --tt: var(--bm-alert-text); }
      .row.na .lvl { font-weight: 400; }
      /* Only the rows needing attention are tinted; an OK row keeps the neutral tile, its colour on the icon and the bar */
      .row.warn, .row.alert { background: color-mix(in srgb, var(--t) 12%, var(--secondary-background-color, transparent)); }
      .row.ok:hover { background: color-mix(in srgb, var(--secondary-text-color) 10%, var(--secondary-background-color, transparent)); }
      .row.warn:hover, .row.alert:hover { background: color-mix(in srgb, var(--t) 18%, var(--secondary-background-color, transparent)); }
      .row:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      .ic { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
            color: var(--t); background: color-mix(in srgb, var(--t) 18%, transparent); }
      .ic ha-icon { --mdc-icon-size: 16px; }
      .row.due .ic { animation: bm-blink 1.5s ease-in-out infinite; }
      .txt { flex: 1; display: flex; flex-direction: column; min-width: 0; }
      .name { font-size: 13px; font-weight: 500; line-height: 1.2; color: var(--primary-text-color);
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sub { font-size: 11px; line-height: 1.2; color: var(--secondary-text-color);
             white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .row.warn .sub, .row.alert .sub { color: var(--tt); }
      /* A status of several words (nl “Niet beschikbaar”) wraps rather than squeezing the name out of a narrow column;
         it never gets narrower than its longest word */
      .lvl { flex: 0 1 auto; max-width: 45%; min-width: min-content; text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 3px;
             font-size: 12px; font-weight: 500; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
      .row:not(.ok) .lvl { color: var(--tt); }
      .track { width: 44px; height: 4px; border-radius: 2px; overflow: hidden;
               background: color-mix(in srgb, var(--secondary-text-color) 22%, transparent); }
      .bar { display: block; height: 100%; border-radius: 2px; background: var(--t); }

      /* Narrow (a card of 6 columns, half a section on a phone): the spacing tightens and the badge shrinks. */
      @container (max-width: 240px) {
        .head { gap: 6px; }
        .main { column-gap: 6px; }
        .badge { width: 32px; height: 32px; }
        .badge ha-icon { --mdc-icon-size: 20px; }
      }
      /* Narrower still (half of a phone's section): the badge goes, its colour stays on the pill; each battery's
         level goes under its name, so that a status such as "Unavailable" no longer squeezes the name out. */
      @container (max-width: 180px) {
        .badge { display: none; }
        .row { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 8px; row-gap: 3px; }
        .ic { grid-row: span 2; }
        .lvl { max-width: none; min-width: 0; flex-direction: row; align-items: center; justify-content: flex-start;
               gap: 6px; text-align: left; overflow-wrap: anywhere; }
      }

      @keyframes bm-blink { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
      @keyframes bm-spin { to { transform: rotate(360deg) } }
      @media (prefers-reduced-motion: reduce) { .row.due .ic, .notify[data-state='busy'] ha-icon { animation: none; } }
    `;
  }

  // The full screen layer: opaque over translucent themes, one column on a phone, groups in balanced columns wider.
  static get popupStyles() {
    return `
      :host { all: initial; display: block; font-family: var(--paper-font-body1_-_font-family, var(--ha-font-family-body, Roboto, sans-serif));
              color: var(--primary-text-color); -webkit-font-smoothing: antialiased; }
      .backdrop { position: fixed; inset: 0; z-index: var(--bm-layer, 9999); background: rgba(0,0,0,.6);
                  -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); animation: bm-fade .2s ease-out both; }
      .sheet { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; animation: bm-sheet .28s cubic-bezier(.2,.8,.2,1) both;
               background: linear-gradient(var(--card-background-color, #fff), var(--card-background-color, #fff)), var(--primary-background-color, #fafafa); }
      ha-card.popup { --ha-card-border-radius: 0; --ha-card-box-shadow: none; border-radius: 0; box-shadow: none; background: transparent; border: none;
                      min-height: 100%; box-sizing: border-box; max-width: 1800px; margin: 0 auto; overflow: visible;
                      padding: 0 max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
      .popup .head { position: sticky; top: 0; z-index: 2; padding: max(10px, env(safe-area-inset-top)) 0 10px;
                     background: linear-gradient(var(--card-background-color, #fff), var(--card-background-color, #fff)), var(--primary-background-color, #fafafa); }
      .popup .title { font-size: 18px; }
      .close { all: unset; cursor: pointer; flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
               background: var(--secondary-background-color, rgba(128,128,128,.12)); color: var(--primary-text-color); }
      .close:hover { background: color-mix(in srgb, var(--primary-text-color) 14%, transparent); }
      .close:focus-visible, .tab:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }

      .bar-top { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 20px; margin: 6px 0 16px; }
      .tabs { display: inline-flex; gap: 4px; padding: 3px; border-radius: 12px; background: var(--secondary-background-color, rgba(128,128,128,.1)); }
      .tab { all: unset; cursor: pointer; padding: 6px 14px; border-radius: 9px; font-size: 13px; font-weight: 500; color: var(--secondary-text-color); }
      .tab.on { background: color-mix(in srgb, var(--primary-color) 15%, transparent); color: var(--bm-primary-text); }
      .replace { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; color: var(--secondary-text-color); }
      .rlabel { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; text-transform: uppercase;
                letter-spacing: .04em; color: var(--secondary-text-color); }
      .rlabel ha-icon { --mdc-icon-size: 16px; }
      .buy { padding: 2px 9px; border-radius: 999px; color: var(--primary-text-color);
             background: color-mix(in srgb, var(--bm-warn) 16%, transparent); }
      .buy b { color: var(--bm-warn-text); }
      .buy.unknown { background: color-mix(in srgb, var(--bm-na) 18%, transparent); }
      .buy.unknown b { color: var(--secondary-text-color); }
      .none { color: var(--bm-ok-text); font-weight: 500; }

      .groups { display: flex; flex-direction: column; gap: 18px; }
      .group { display: flex; flex-direction: column; gap: 6px; }
      .ghead { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: var(--primary-text-color); }
      .ghead ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
      .gname { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .gchip { font-size: 11px; padding: 1px 8px; border-radius: 999px; color: var(--bm-warn-text);
               background: color-mix(in srgb, var(--bm-warn) 14%, transparent); }
      .gcount { font-size: 11px; font-weight: 400; color: var(--secondary-text-color); }
      .ghint { font-size: 11px; color: var(--secondary-text-color); margin-top: -2px; }
      .glist { display: grid; gap: 6px; }
      @media (min-width: 760px) {
        ha-card.popup { padding-left: max(24px, env(safe-area-inset-left)); padding-right: max(24px, env(safe-area-inset-right)); }
        .groups { display: block; columns: 2 320px; column-gap: 28px; }
        .group { break-inside: avoid; margin-bottom: 20px; }
      }
      @media (min-width: 1200px) { .groups { columns: 3 320px; } }
      @media (min-width: 1600px) { .groups { columns: 4 320px; } }
      @keyframes bm-fade { from { opacity: 0 } to { opacity: 1 } }
      @keyframes bm-sheet { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: none } }
      @media (prefers-reduced-motion: reduce) { .backdrop, .sheet { animation: none !important; } }
    `;
  }
}

// ── Editor ───────────────────────────────────────────────────────────────────
const BM_HELPERS = ['entity', 'title', 'only_low', 'hide_when_ok', 'notify_button', 'popup', 'language', 'battery_models', 'battery_types'];

// A map of the editor (battery types by battery or by model) without its empty entries, or undefined when empty.
const bmCleanMap = (map) => {
  const out = Object.fromEntries(Object.entries(map || {}).filter(([, v]) => v && String(v).trim()));
  return Object.keys(out).length ? out : undefined;
};

class BatteryMonitorCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  _update() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      // The language is read at each call: changing the language option translates the labels at once.
      const t = (key) => bmT(bmLang(this._hass, this._config), key);
      // Inside "Battery types", each field is a battery: labelled with its name and room.
      this._form.computeLabel = (s) => this._labels?.[s.name] ?? t(`ed_${s.name}`);
      this._form.computeHelper = (s) => (BM_HELPERS.includes(s.name) ? t(`ed_${s.name}_helper`) : undefined);
      this._form.addEventListener('value-changed', (ev) => {
        const config = { ...ev.detail.value };
        // Options left at their default are not written to the YAML.
        for (const k of Object.keys(config)) {
          if (config[k] === '' || config[k] == null || BM_DEFAULTS[k] === config[k]) delete config[k];
        }
        for (const key of ['battery_models', 'battery_types']) {
          const map = bmCleanMap(config[key]);
          if (map) config[key] = map;
          else delete config[key];
        }
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    const c = this._config;
    const lang = bmLang(this._hass, c);
    const entity = c.entity || bmPick(this._hass, bmCandidates(this._hass.entities));
    // The schema and the data only depend on the config, the registries, the language and the sensor's state:
    // reassigning them at every Home Assistant update would re-render ha-form while the user is typing.
    const deps = this._deps;
    if (
      deps &&
      deps.config === c &&
      deps.lang === lang &&
      deps.state === this._hass.states?.[entity] &&
      deps.entities === this._hass.entities &&
      deps.devices === this._hass.devices
    ) {
      return;
    }
    this._deps = {
      config: c,
      lang,
      state: this._hass.states?.[entity],
      entities: this._hass.entities,
      devices: this._hass.devices,
    };
    this._form.data = {
      ...BM_DEFAULTS,
      ...c,
      battery_models: { ...(c.battery_models || {}) },
      battery_types: { ...(c.battery_types || {}) },
    };
    const all = this._hass.states?.[entity]?.attributes.batteries || [];
    // By model: the models of the batteries whose type is not detected (and the ones already set), with their
    // manufacturer and how many devices; by battery: the ones left without a type, and the ones already set.
    const undetected = all.filter((b) => !bmDetectedType(this._hass, b));
    const models = new Map();
    for (const b of all) {
      const model = bmModelOf(this._hass, b);
      if (!model || (!c.battery_models?.[model] && !undetected.includes(b))) continue;
      const m = models.get(model) || { n: 0, maker: this._hass.devices?.[b.device_id]?.manufacturer || '' };
      m.n += 1;
      models.set(model, m);
    }
    const batteries = all.filter(
      (b) => c.battery_types?.[b.entity_id] || (undetected.includes(b) && !c.battery_models?.[bmModelOf(this._hass, b)]),
    );
    this._labels = {
      ...Object.fromEntries(
        [...models].map(([model, m]) => [
          model,
          [model, m.maker, bmT(lang, m.n > 1 ? 'devices_n' : 'devices_one', { n: m.n })].filter(Boolean).join(' · '),
        ]),
      ),
      ...Object.fromEntries(batteries.map((b) => [b.entity_id, b.area ? `${b.name} · ${b.area}` : b.name])),
    };
    const typeOptions = BM_TYPES.map((v) => ({ value: v, label: v === 'rechargeable' ? bmT(lang, 'rechargeable') : v }));
    this._form.schema = [
      { name: 'entity', selector: { entity: { filter: { integration: 'battery_monitor', domain: 'sensor' } } } },
      { name: 'title', selector: { text: {} } },
      { name: 'columns', selector: { number: { min: 1, max: 3, mode: 'box' } } },
      { name: 'only_low', selector: { boolean: {} } },
      { name: 'hide_when_ok', selector: { boolean: {} } },
      { name: 'notify_button', selector: { boolean: {} } },
      { name: 'popup', selector: { boolean: {} } },
      {
        name: 'language',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'en', label: 'English' },
              { value: 'fr', label: 'Français' },
              { value: 'de', label: 'Deutsch' },
              { value: 'es', label: 'Español' },
              { value: 'it', label: 'Italiano' },
              { value: 'nl', label: 'Nederlands' },
              { value: 'pt', label: 'Português (Portugal)' },
              { value: 'pl', label: 'Polski' },
              { value: 'sr', label: 'Српски' },
              { value: 'sr-Latn', label: 'Srpski (latinica)' },
            ],
          },
        },
      },
      ...bmTypeSection('battery_models', 'mdi:devices', [...models.keys()].sort(), typeOptions, lang),
      ...bmTypeSection('battery_types', 'mdi:battery-outline', batteries.map((b) => b.entity_id), typeOptions, lang),
    ];
  }
}

// A folded editor section with a type field for each of `names` (models or battery entities), none when empty.
function bmTypeSection(name, icon, names, options, lang) {
  if (!names.length) return [];
  const selector = { select: { mode: 'dropdown', custom_value: true, options } };
  return [{ name, type: 'expandable', title: bmT(lang, `ed_${name}`), icon, schema: names.map((n) => ({ name: n, selector })) }];
}

if (!customElements.get('battery-monitor-card')) {
  customElements.define('battery-monitor-card', BatteryMonitorCard);
  customElements.define('battery-monitor-card-editor', BatteryMonitorCardEditor);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'battery-monitor-card',
    name: 'Battery Monitor Card',
    description: 'The batteries watched by Battery Monitor: icon, name and level, the lowest first',
    preview: true,
    documentationURL: 'https://github.com/juju35/ha-battery-monitor',
  });
  console.info(
    `%c BATTERY-MONITOR-CARD %c v${BATTERY_MONITOR_CARD_VERSION} `,
    'background:#14b8a6;color:#fff;font-weight:700',
    '',
  );
}
