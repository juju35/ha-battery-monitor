/*
 * Battery Monitor sidebar panel — the batteries, the settings and the actions on one page (administrators only).
 *
 * Three tabs under the toolbar: Batteries (the bundled battery-monitor-card expanded: every battery by room, by
 * type or by replacement date, what to replace, the next replacement; its CSV export lives in Actions), Settings (threshold, duration,
 * notification times, notify actions, ignored integrations and batteries, through the battery_monitor/settings
 * and battery_monitor/update_settings WebSocket commands) and Actions (notify now, battery_monitor/notify; CSV
 * export, battery_monitor/export) — in the order Batteries, Actions, Settings. The page follows the config entry (config_entries/subscribe), so options
 * changed from Configure show up here. The tab is in the address (/battery-monitor/settings), as Smart Comfort does.
 *
 * https://github.com/juju35/ha-battery-monitor
 */
var BATTERY_MONITOR_PANEL_VERSION = '1.18.2';

var BatteryMonitorPanelI18n = {
  en: {
    title: 'Battery Monitor',
    batteries: 'Batteries',
    settings: 'Settings',
    actions: 'Actions',
    none: 'Not set up yet: add the integration to Home Assistant.',
    open_add: 'Add the integration',
    loading: 'Loading…',
    f_threshold: 'Low battery threshold',
    f_threshold_hint: 'A battery is low below this level, {min}–{max} %',
    f_duration: 'Duration before notifying',
    f_duration_hint: 'Hours low or unavailable before a battery is notified, 0 = right away, up to {max} h',
    f_morning: 'Morning notification',
    f_evening: 'Evening notification',
    f_times_hint: 'Local time; the same time twice sends one notification',
    f_notify: 'Notify actions',
    f_notify_hint: 'Each one receives the notification, besides the persistent notification',
    f_ignored_integrations: 'Ignored integrations',
    f_ignored_integrations_hint: 'Their batteries are left out (phones and tablets of the mobile app by default)',
    f_ignored_entities: 'Ignored batteries',
    f_ignored_entities_hint: 'Batteries left out one by one',
    pick: 'Add…',
    no_choice: 'Nothing else to add',
    remove_chip: 'Remove {name}',
    u_percent: '%',
    u_hours: 'h',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved',
    notify: 'Notify now',
    notifying: 'Sending…',
    notified: 'Notification sent · to check: {count}',
    notified_none: 'Notification sent: no battery to check',
    notified_count: 'to check: {count}',
    export: 'Export CSV',
    exporting: 'Exporting…',
    exported: 'CSV written to {path} · batteries: {count}',
    f_path: 'CSV file',
    f_path_hint: 'Blank: battery_monitor.csv in the configuration folder',
    last_notification: 'Last notification',
    never: 'Never yet',
    open_device: 'Device',
    open_integration: 'Devices & services',
    err_range: 'Value out of range',
    err_not_found: 'Integration not set up',
    err_not_loaded: 'Integration not running',
    err_path_not_allowed: 'Path outside the configuration folder',
    err_path_hidden: 'Path in a hidden folder',
    err_path_not_csv: 'Not a .csv file',
    err_write_failed: 'Could not write the file',
    err_generic: 'Something went wrong',
    st_loaded: 'Running',
    st_setup_retry: 'Retrying',
    st_setup_error: 'Setup failed',
    st_not_loaded: 'Stopped',
    st_other: 'Unavailable',
  },
  fr: {
    title: 'Battery Monitor',
    batteries: 'Batteries',
    settings: 'Réglages',
    actions: 'Actions',
    none: 'Pas encore configuré : ajoutez l’intégration à Home Assistant.',
    open_add: 'Ajouter l’intégration',
    loading: 'Chargement…',
    f_threshold: 'Seuil de batterie faible',
    f_threshold_hint: 'Une batterie est faible sous ce niveau, {min}–{max} %',
    f_duration: 'Durée avant notification',
    f_duration_hint: 'Heures faible ou indisponible avant qu’une batterie soit notifiée, 0 = tout de suite, jusqu’à {max} h',
    f_morning: 'Notification du matin',
    f_evening: 'Notification du soir',
    f_times_hint: 'Heure locale ; la même heure deux fois n’envoie qu’une notification',
    f_notify: 'Actions de notification',
    f_notify_hint: 'Chacune reçoit la notification, en plus de la notification persistante',
    f_ignored_integrations: 'Intégrations ignorées',
    f_ignored_integrations_hint: 'Leurs batteries sont laissées de côté (téléphones et tablettes de l’app mobile par défaut)',
    f_ignored_entities: 'Batteries ignorées',
    f_ignored_entities_hint: 'Batteries laissées de côté une par une',
    pick: 'Ajouter…',
    no_choice: 'Plus rien à ajouter',
    remove_chip: 'Retirer {name}',
    u_percent: '%',
    u_hours: 'h',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    saved: 'Enregistré',
    notify: 'Notifier maintenant',
    notifying: 'Envoi…',
    notified: 'Notification envoyée · à vérifier : {count}',
    notified_none: 'Notification envoyée : aucune batterie à vérifier',
    notified_count: 'à vérifier : {count}',
    export: 'Exporter en CSV',
    exporting: 'Export…',
    exported: 'CSV écrit dans {path} · batteries : {count}',
    f_path: 'Fichier CSV',
    f_path_hint: 'Vide : battery_monitor.csv dans le dossier de configuration',
    last_notification: 'Dernière notification',
    never: 'Jamais encore',
    open_device: 'Appareil',
    open_integration: 'Appareils et services',
    err_range: 'Valeur hors limites',
    err_not_found: 'Intégration non configurée',
    err_not_loaded: 'Intégration arrêtée',
    err_path_not_allowed: 'Chemin hors du dossier de configuration',
    err_path_hidden: 'Chemin dans un dossier caché',
    err_path_not_csv: 'Pas un fichier .csv',
    err_write_failed: 'Impossible d’écrire le fichier',
    err_generic: 'Une erreur s’est produite',
    st_loaded: 'En marche',
    st_setup_retry: 'Nouvel essai',
    st_setup_error: 'Échec du démarrage',
    st_not_loaded: 'Arrêtée',
    st_other: 'Indisponible',
  },
  de: {
    title: 'Battery Monitor',
    batteries: 'Batterien',
    settings: 'Einstellungen',
    actions: 'Aktionen',
    none: 'Noch nicht eingerichtet: Integration zu Home Assistant hinzufügen.',
    open_add: 'Integration hinzufügen',
    loading: 'Wird geladen…',
    f_threshold: 'Schwelle für niedrige Batterie',
    f_threshold_hint: 'Unter diesem Stand ist eine Batterie niedrig, {min}–{max} %',
    f_duration: 'Dauer vor der Benachrichtigung',
    f_duration_hint: 'Stunden niedrig oder nicht verfügbar, bevor eine Batterie gemeldet wird, 0 = sofort, bis {max} h',
    f_morning: 'Benachrichtigung am Morgen',
    f_evening: 'Benachrichtigung am Abend',
    f_times_hint: 'Ortszeit; dieselbe Uhrzeit zweimal sendet eine Benachrichtigung',
    f_notify: 'Benachrichtigungsaktionen',
    f_notify_hint: 'Jede erhält die Benachrichtigung, zusätzlich zur dauerhaften Benachrichtigung',
    f_ignored_integrations: 'Ignorierte Integrationen',
    f_ignored_integrations_hint: 'Ihre Batterien bleiben außen vor (standardmäßig Telefone und Tablets der Mobile App)',
    f_ignored_entities: 'Ignorierte Batterien',
    f_ignored_entities_hint: 'Einzeln ausgelassene Batterien',
    pick: 'Hinzufügen…',
    no_choice: 'Nichts mehr hinzuzufügen',
    remove_chip: '{name} entfernen',
    u_percent: '%',
    u_hours: 'h',
    save: 'Speichern',
    saving: 'Wird gespeichert…',
    saved: 'Gespeichert',
    notify: 'Jetzt benachrichtigen',
    notifying: 'Wird gesendet…',
    notified: 'Benachrichtigung gesendet · zu prüfen: {count}',
    notified_none: 'Benachrichtigung gesendet: keine Batterie zu prüfen',
    notified_count: 'zu prüfen: {count}',
    export: 'CSV exportieren',
    exporting: 'Wird exportiert…',
    exported: 'CSV geschrieben nach {path} · Batterien: {count}',
    f_path: 'CSV-Datei',
    f_path_hint: 'Leer: battery_monitor.csv im Konfigurationsordner',
    last_notification: 'Letzte Benachrichtigung',
    never: 'Noch nie',
    open_device: 'Gerät',
    open_integration: 'Geräte & Dienste',
    err_range: 'Wert außerhalb des Bereichs',
    err_not_found: 'Integration nicht eingerichtet',
    err_not_loaded: 'Integration läuft nicht',
    err_path_not_allowed: 'Pfad außerhalb des Konfigurationsordners',
    err_path_hidden: 'Pfad in einem versteckten Ordner',
    err_path_not_csv: 'Keine .csv-Datei',
    err_write_failed: 'Datei konnte nicht geschrieben werden',
    err_generic: 'Etwas ist schiefgelaufen',
    st_loaded: 'Läuft',
    st_setup_retry: 'Neuer Versuch',
    st_setup_error: 'Einrichtung fehlgeschlagen',
    st_not_loaded: 'Gestoppt',
    st_other: 'Nicht verfügbar',
  },
  es: {
    title: 'Battery Monitor',
    batteries: 'Baterías',
    settings: 'Ajustes',
    actions: 'Acciones',
    none: 'Aún no configurado: añade la integración a Home Assistant.',
    open_add: 'Añadir la integración',
    loading: 'Cargando…',
    f_threshold: 'Umbral de batería baja',
    f_threshold_hint: 'Una batería está baja por debajo de este nivel, {min}–{max} %',
    f_duration: 'Duración antes de notificar',
    f_duration_hint: 'Horas baja o no disponible antes de notificar una batería, 0 = de inmediato, hasta {max} h',
    f_morning: 'Notificación de la mañana',
    f_evening: 'Notificación de la tarde',
    f_times_hint: 'Hora local; la misma hora dos veces envía una sola notificación',
    f_notify: 'Acciones de notificación',
    f_notify_hint: 'Cada una recibe la notificación, además de la notificación persistente',
    f_ignored_integrations: 'Integraciones ignoradas',
    f_ignored_integrations_hint: 'Sus baterías quedan fuera (teléfonos y tabletas de la app móvil por defecto)',
    f_ignored_entities: 'Baterías ignoradas',
    f_ignored_entities_hint: 'Baterías excluidas una a una',
    pick: 'Añadir…',
    no_choice: 'Nada más que añadir',
    remove_chip: 'Quitar {name}',
    u_percent: '%',
    u_hours: 'h',
    save: 'Guardar',
    saving: 'Guardando…',
    saved: 'Guardado',
    notify: 'Notificar ahora',
    notifying: 'Enviando…',
    notified: 'Notificación enviada · por revisar: {count}',
    notified_none: 'Notificación enviada: ninguna batería por revisar',
    notified_count: 'por revisar: {count}',
    export: 'Exportar CSV',
    exporting: 'Exportando…',
    exported: 'CSV escrito en {path} · baterías: {count}',
    f_path: 'Archivo CSV',
    f_path_hint: 'Vacío: battery_monitor.csv en la carpeta de configuración',
    last_notification: 'Última notificación',
    never: 'Todavía nunca',
    open_device: 'Dispositivo',
    open_integration: 'Dispositivos y servicios',
    err_range: 'Valor fuera de rango',
    err_not_found: 'Integración no configurada',
    err_not_loaded: 'Integración detenida',
    err_path_not_allowed: 'Ruta fuera de la carpeta de configuración',
    err_path_hidden: 'Ruta en una carpeta oculta',
    err_path_not_csv: 'No es un archivo .csv',
    err_write_failed: 'No se pudo escribir el archivo',
    err_generic: 'Algo ha fallado',
    st_loaded: 'En marcha',
    st_setup_retry: 'Reintentando',
    st_setup_error: 'Error de configuración',
    st_not_loaded: 'Detenida',
    st_other: 'No disponible',
  },
  it: {
    title: 'Battery Monitor',
    batteries: 'Batterie',
    settings: 'Impostazioni',
    actions: 'Azioni',
    none: 'Non ancora configurato: aggiungi l’integrazione a Home Assistant.',
    open_add: 'Aggiungi l’integrazione',
    loading: 'Caricamento…',
    f_threshold: 'Soglia di batteria scarica',
    f_threshold_hint: 'Una batteria è scarica sotto questo livello, {min}–{max} %',
    f_duration: 'Durata prima della notifica',
    f_duration_hint: 'Ore scarica o non disponibile prima che una batteria sia notificata, 0 = subito, fino a {max} h',
    f_morning: 'Notifica del mattino',
    f_evening: 'Notifica della sera',
    f_times_hint: 'Ora locale; la stessa ora due volte invia una sola notifica',
    f_notify: 'Azioni di notifica',
    f_notify_hint: 'Ognuna riceve la notifica, oltre alla notifica persistente',
    f_ignored_integrations: 'Integrazioni ignorate',
    f_ignored_integrations_hint: 'Le loro batterie sono escluse (telefoni e tablet dell’app mobile per impostazione predefinita)',
    f_ignored_entities: 'Batterie ignorate',
    f_ignored_entities_hint: 'Batterie escluse una per una',
    pick: 'Aggiungi…',
    no_choice: 'Nient’altro da aggiungere',
    remove_chip: 'Rimuovi {name}',
    u_percent: '%',
    u_hours: 'h',
    save: 'Salva',
    saving: 'Salvataggio…',
    saved: 'Salvato',
    notify: 'Notifica ora',
    notifying: 'Invio…',
    notified: 'Notifica inviata · da controllare: {count}',
    notified_none: 'Notifica inviata: nessuna batteria da controllare',
    notified_count: 'da controllare: {count}',
    export: 'Esporta CSV',
    exporting: 'Esportazione…',
    exported: 'CSV scritto in {path} · batterie: {count}',
    f_path: 'File CSV',
    f_path_hint: 'Vuoto: battery_monitor.csv nella cartella di configurazione',
    last_notification: 'Ultima notifica',
    never: 'Mai finora',
    open_device: 'Dispositivo',
    open_integration: 'Dispositivi e servizi',
    err_range: 'Valore fuori intervallo',
    err_not_found: 'Integrazione non configurata',
    err_not_loaded: 'Integrazione non in esecuzione',
    err_path_not_allowed: 'Percorso fuori dalla cartella di configurazione',
    err_path_hidden: 'Percorso in una cartella nascosta',
    err_path_not_csv: 'Non è un file .csv',
    err_write_failed: 'Impossibile scrivere il file',
    err_generic: 'Qualcosa è andato storto',
    st_loaded: 'In esecuzione',
    st_setup_retry: 'Nuovo tentativo',
    st_setup_error: 'Configurazione non riuscita',
    st_not_loaded: 'Ferma',
    st_other: 'Non disponibile',
  },
  nl: {
    title: 'Battery Monitor',
    batteries: 'Batterijen',
    settings: 'Instellingen',
    actions: 'Acties',
    none: 'Nog niet ingesteld: voeg de integratie toe aan Home Assistant.',
    open_add: 'Integratie toevoegen',
    loading: 'Laden…',
    f_threshold: 'Drempel voor lage batterij',
    f_threshold_hint: 'Onder dit niveau is een batterij laag, {min}–{max} %',
    f_duration: 'Duur vóór de melding',
    f_duration_hint: 'Uren laag of niet beschikbaar voordat een batterij wordt gemeld, 0 = meteen, tot {max} u',
    f_morning: 'Ochtendmelding',
    f_evening: 'Avondmelding',
    f_times_hint: 'Lokale tijd; dezelfde tijd twee keer stuurt één melding',
    f_notify: 'Meldingsacties',
    f_notify_hint: 'Elke actie ontvangt de melding, naast de blijvende melding',
    f_ignored_integrations: 'Genegeerde integraties',
    f_ignored_integrations_hint: 'Hun batterijen blijven buiten beschouwing (standaard telefoons en tablets van de mobiele app)',
    f_ignored_entities: 'Genegeerde batterijen',
    f_ignored_entities_hint: 'Batterijen die één voor één worden overgeslagen',
    pick: 'Toevoegen…',
    no_choice: 'Niets meer toe te voegen',
    remove_chip: '{name} verwijderen',
    u_percent: '%',
    u_hours: 'u',
    save: 'Opslaan',
    saving: 'Opslaan…',
    saved: 'Opgeslagen',
    notify: 'Nu melden',
    notifying: 'Verzenden…',
    notified: 'Melding verzonden · te controleren: {count}',
    notified_none: 'Melding verzonden: geen batterij te controleren',
    notified_count: 'te controleren: {count}',
    export: 'CSV exporteren',
    exporting: 'Exporteren…',
    exported: 'CSV geschreven naar {path} · batterijen: {count}',
    f_path: 'CSV-bestand',
    f_path_hint: 'Leeg: battery_monitor.csv in de configuratiemap',
    last_notification: 'Laatste melding',
    never: 'Nog nooit',
    open_device: 'Apparaat',
    open_integration: 'Apparaten en diensten',
    err_range: 'Waarde buiten bereik',
    err_not_found: 'Integratie niet ingesteld',
    err_not_loaded: 'Integratie draait niet',
    err_path_not_allowed: 'Pad buiten de configuratiemap',
    err_path_hidden: 'Pad in een verborgen map',
    err_path_not_csv: 'Geen .csv-bestand',
    err_write_failed: 'Bestand kon niet worden geschreven',
    err_generic: 'Er is iets misgegaan',
    st_loaded: 'Actief',
    st_setup_retry: 'Opnieuw proberen',
    st_setup_error: 'Instellen mislukt',
    st_not_loaded: 'Gestopt',
    st_other: 'Niet beschikbaar',
  },
  pt: {
    title: 'Battery Monitor',
    batteries: 'Baterias',
    settings: 'Definições',
    actions: 'Ações',
    none: 'Ainda não configurado: adicione a integração ao Home Assistant.',
    open_add: 'Adicionar a integração',
    loading: 'A carregar…',
    f_threshold: 'Limiar de bateria fraca',
    f_threshold_hint: 'Uma bateria está fraca abaixo deste nível, {min}–{max} %',
    f_duration: 'Duração antes de notificar',
    f_duration_hint: 'Horas fraca ou indisponível antes de uma bateria ser notificada, 0 = de imediato, até {max} h',
    f_morning: 'Notificação da manhã',
    f_evening: 'Notificação da noite',
    f_times_hint: 'Hora local; a mesma hora duas vezes envia uma só notificação',
    f_notify: 'Ações de notificação',
    f_notify_hint: 'Cada uma recebe a notificação, além da notificação persistente',
    f_ignored_integrations: 'Integrações ignoradas',
    f_ignored_integrations_hint: 'As suas baterias ficam de fora (telemóveis e tablets da app móvel por predefinição)',
    f_ignored_entities: 'Baterias ignoradas',
    f_ignored_entities_hint: 'Baterias deixadas de fora uma a uma',
    pick: 'Adicionar…',
    no_choice: 'Nada mais a adicionar',
    remove_chip: 'Remover {name}',
    u_percent: '%',
    u_hours: 'h',
    save: 'Guardar',
    saving: 'A guardar…',
    saved: 'Guardado',
    notify: 'Notificar agora',
    notifying: 'A enviar…',
    notified: 'Notificação enviada · a verificar: {count}',
    notified_none: 'Notificação enviada: nenhuma bateria a verificar',
    notified_count: 'a verificar: {count}',
    export: 'Exportar CSV',
    exporting: 'A exportar…',
    exported: 'CSV escrito em {path} · baterias: {count}',
    f_path: 'Ficheiro CSV',
    f_path_hint: 'Vazio: battery_monitor.csv na pasta de configuração',
    last_notification: 'Última notificação',
    never: 'Ainda nunca',
    open_device: 'Dispositivo',
    open_integration: 'Dispositivos e serviços',
    err_range: 'Valor fora dos limites',
    err_not_found: 'Integração não configurada',
    err_not_loaded: 'Integração parada',
    err_path_not_allowed: 'Caminho fora da pasta de configuração',
    err_path_hidden: 'Caminho numa pasta oculta',
    err_path_not_csv: 'Não é um ficheiro .csv',
    err_write_failed: 'Não foi possível escrever o ficheiro',
    err_generic: 'Algo correu mal',
    st_loaded: 'Em execução',
    st_setup_retry: 'Nova tentativa',
    st_setup_error: 'Configuração falhou',
    st_not_loaded: 'Parada',
    st_other: 'Indisponível',
  },
  pl: {
    title: 'Battery Monitor',
    batteries: 'Baterie',
    settings: 'Ustawienia',
    actions: 'Akcje',
    none: 'Jeszcze nie skonfigurowano: dodaj integrację do Home Assistant.',
    open_add: 'Dodaj integrację',
    loading: 'Ładowanie…',
    f_threshold: 'Próg niskiej baterii',
    f_threshold_hint: 'Poniżej tego poziomu bateria jest niska, {min}–{max} %',
    f_duration: 'Czas przed powiadomieniem',
    f_duration_hint: 'Godziny niskiej lub niedostępnej baterii przed powiadomieniem, 0 = od razu, do {max} h',
    f_morning: 'Powiadomienie poranne',
    f_evening: 'Powiadomienie wieczorne',
    f_times_hint: 'Czas lokalny; ta sama godzina dwa razy wysyła jedno powiadomienie',
    f_notify: 'Akcje powiadomień',
    f_notify_hint: 'Każda otrzymuje powiadomienie, oprócz powiadomienia trwałego',
    f_ignored_integrations: 'Ignorowane integracje',
    f_ignored_integrations_hint: 'Ich baterie są pomijane (domyślnie telefony i tablety aplikacji mobilnej)',
    f_ignored_entities: 'Ignorowane baterie',
    f_ignored_entities_hint: 'Baterie pomijane pojedynczo',
    pick: 'Dodaj…',
    no_choice: 'Nie ma już nic do dodania',
    remove_chip: 'Usuń {name}',
    u_percent: '%',
    u_hours: 'h',
    save: 'Zapisz',
    saving: 'Zapisywanie…',
    saved: 'Zapisano',
    notify: 'Powiadom teraz',
    notifying: 'Wysyłanie…',
    notified: 'Powiadomienie wysłane · do sprawdzenia: {count}',
    notified_none: 'Powiadomienie wysłane: brak baterii do sprawdzenia',
    notified_count: 'do sprawdzenia: {count}',
    export: 'Eksportuj CSV',
    exporting: 'Eksportowanie…',
    exported: 'CSV zapisano w {path} · baterie: {count}',
    f_path: 'Plik CSV',
    f_path_hint: 'Puste: battery_monitor.csv w folderze konfiguracji',
    last_notification: 'Ostatnie powiadomienie',
    never: 'Jeszcze nigdy',
    open_device: 'Urządzenie',
    open_integration: 'Urządzenia i usługi',
    err_range: 'Wartość poza zakresem',
    err_not_found: 'Integracja nie jest skonfigurowana',
    err_not_loaded: 'Integracja nie działa',
    err_path_not_allowed: 'Ścieżka poza folderem konfiguracji',
    err_path_hidden: 'Ścieżka w ukrytym folderze',
    err_path_not_csv: 'To nie jest plik .csv',
    err_write_failed: 'Nie udało się zapisać pliku',
    err_generic: 'Coś poszło nie tak',
    st_loaded: 'Działa',
    st_setup_retry: 'Ponawianie',
    st_setup_error: 'Konfiguracja nie powiodła się',
    st_not_loaded: 'Zatrzymana',
    st_other: 'Niedostępna',
  },
  ro: {
    title: 'Battery Monitor',
    batteries: 'Baterii',
    settings: 'Setări',
    actions: 'Acțiuni',
    none: 'Încă neconfigurat: adaugă integrarea în Home Assistant.',
    open_add: 'Adaugă integrarea',
    loading: 'Se încarcă…',
    f_threshold: 'Prag de baterie slabă',
    f_threshold_hint: 'O baterie este slabă sub acest nivel, {min}–{max} %',
    f_duration: 'Durată înainte de notificare',
    f_duration_hint: 'Ore slabă sau indisponibilă înainte ca o baterie să fie notificată, 0 = imediat, până la {max} h',
    f_morning: 'Notificarea de dimineață',
    f_evening: 'Notificarea de seară',
    f_times_hint: 'Ora locală; aceeași oră de două ori trimite o singură notificare',
    f_notify: 'Acțiuni de notificare',
    f_notify_hint: 'Fiecare primește notificarea, pe lângă notificarea persistentă',
    f_ignored_integrations: 'Integrări ignorate',
    f_ignored_integrations_hint: 'Bateriile lor sunt lăsate deoparte (implicit telefoanele și tabletele aplicației mobile)',
    f_ignored_entities: 'Baterii ignorate',
    f_ignored_entities_hint: 'Baterii lăsate deoparte una câte una',
    pick: 'Adaugă…',
    no_choice: 'Nimic altceva de adăugat',
    remove_chip: 'Elimină {name}',
    u_percent: '%',
    u_hours: 'h',
    save: 'Salvează',
    saving: 'Se salvează…',
    saved: 'Salvat',
    notify: 'Notifică acum',
    notifying: 'Se trimite…',
    notified: 'Notificare trimisă · de verificat: {count}',
    notified_none: 'Notificare trimisă: nicio baterie de verificat',
    notified_count: 'de verificat: {count}',
    export: 'Exportă CSV',
    exporting: 'Se exportă…',
    exported: 'CSV scris în {path} · baterii: {count}',
    f_path: 'Fișier CSV',
    f_path_hint: 'Gol: battery_monitor.csv în dosarul de configurare',
    last_notification: 'Ultima notificare',
    never: 'Niciodată încă',
    open_device: 'Dispozitiv',
    open_integration: 'Dispozitive și servicii',
    err_range: 'Valoare în afara intervalului',
    err_not_found: 'Integrare neconfigurată',
    err_not_loaded: 'Integrarea nu rulează',
    err_path_not_allowed: 'Cale în afara dosarului de configurare',
    err_path_hidden: 'Cale într-un dosar ascuns',
    err_path_not_csv: 'Nu este un fișier .csv',
    err_write_failed: 'Fișierul nu a putut fi scris',
    err_generic: 'Ceva nu a mers',
    st_loaded: 'Rulează',
    st_setup_retry: 'Se reîncearcă',
    st_setup_error: 'Configurarea a eșuat',
    st_not_loaded: 'Oprită',
    st_other: 'Indisponibilă',
  },
  da: {
    title: 'Battery Monitor',
    batteries: 'Batterier',
    settings: 'Indstillinger',
    actions: 'Handlinger',
    none: 'Ikke sat op endnu: tilføj integrationen til Home Assistant.',
    open_add: 'Tilføj integrationen',
    loading: 'Indlæser…',
    f_threshold: 'Grænse for lavt batteri',
    f_threshold_hint: 'Et batteri er lavt under dette niveau, {min}–{max} %',
    f_duration: 'Varighed før besked',
    f_duration_hint: 'Timer lavt eller utilgængeligt, før et batteri meldes, 0 = med det samme, op til {max} t',
    f_morning: 'Morgenbesked',
    f_evening: 'Aftenbesked',
    f_times_hint: 'Lokal tid; samme tidspunkt to gange sender én besked',
    f_notify: 'Beskedhandlinger',
    f_notify_hint: 'Hver af dem modtager beskeden, ud over den vedvarende besked',
    f_ignored_integrations: 'Ignorerede integrationer',
    f_ignored_integrations_hint: 'Deres batterier udelades (som standard telefoner og tablets fra mobilappen)',
    f_ignored_entities: 'Ignorerede batterier',
    f_ignored_entities_hint: 'Batterier udeladt ét ad gangen',
    pick: 'Tilføj…',
    no_choice: 'Ikke mere at tilføje',
    remove_chip: 'Fjern {name}',
    u_percent: '%',
    u_hours: 't',
    save: 'Gem',
    saving: 'Gemmer…',
    saved: 'Gemt',
    notify: 'Send besked nu',
    notifying: 'Sender…',
    notified: 'Besked sendt · at tjekke: {count}',
    notified_none: 'Besked sendt: intet batteri at tjekke',
    notified_count: 'at tjekke: {count}',
    export: 'Eksportér CSV',
    exporting: 'Eksporterer…',
    exported: 'CSV skrevet til {path} · batterier: {count}',
    f_path: 'CSV-fil',
    f_path_hint: 'Tom: battery_monitor.csv i konfigurationsmappen',
    last_notification: 'Seneste besked',
    never: 'Aldrig endnu',
    open_device: 'Enhed',
    open_integration: 'Enheder og tjenester',
    err_range: 'Værdi uden for intervallet',
    err_not_found: 'Integrationen er ikke sat op',
    err_not_loaded: 'Integrationen kører ikke',
    err_path_not_allowed: 'Sti uden for konfigurationsmappen',
    err_path_hidden: 'Sti i en skjult mappe',
    err_path_not_csv: 'Ikke en .csv-fil',
    err_write_failed: 'Filen kunne ikke skrives',
    err_generic: 'Noget gik galt',
    st_loaded: 'Kører',
    st_setup_retry: 'Prøver igen',
    st_setup_error: 'Opsætning mislykkedes',
    st_not_loaded: 'Stoppet',
    st_other: 'Utilgængelig',
  },
  sv: {
    title: 'Battery Monitor',
    batteries: 'Batterier',
    settings: 'Inställningar',
    actions: 'Åtgärder',
    none: 'Inte konfigurerat ännu: lägg till integrationen i Home Assistant.',
    open_add: 'Lägg till integrationen',
    loading: 'Läser in…',
    f_threshold: 'Gräns för lågt batteri',
    f_threshold_hint: 'Ett batteri är lågt under denna nivå, {min}–{max} %',
    f_duration: 'Tid före avisering',
    f_duration_hint: 'Timmar lågt eller otillgängligt innan ett batteri aviseras, 0 = direkt, upp till {max} h',
    f_morning: 'Morgonavisering',
    f_evening: 'Kvällsavisering',
    f_times_hint: 'Lokal tid; samma tid två gånger skickar en avisering',
    f_notify: 'Aviseringsåtgärder',
    f_notify_hint: 'Var och en får aviseringen, utöver den beständiga aviseringen',
    f_ignored_integrations: 'Ignorerade integrationer',
    f_ignored_integrations_hint: 'Deras batterier lämnas utanför (som standard telefoner och surfplattor från mobilappen)',
    f_ignored_entities: 'Ignorerade batterier',
    f_ignored_entities_hint: 'Batterier som lämnas utanför ett i taget',
    pick: 'Lägg till…',
    no_choice: 'Inget mer att lägga till',
    remove_chip: 'Ta bort {name}',
    u_percent: '%',
    u_hours: 'h',
    save: 'Spara',
    saving: 'Sparar…',
    saved: 'Sparat',
    notify: 'Avisera nu',
    notifying: 'Skickar…',
    notified: 'Avisering skickad · att kontrollera: {count}',
    notified_none: 'Avisering skickad: inget batteri att kontrollera',
    notified_count: 'att kontrollera: {count}',
    export: 'Exportera CSV',
    exporting: 'Exporterar…',
    exported: 'CSV skriven till {path} · batterier: {count}',
    f_path: 'CSV-fil',
    f_path_hint: 'Tomt: battery_monitor.csv i konfigurationsmappen',
    last_notification: 'Senaste avisering',
    never: 'Aldrig ännu',
    open_device: 'Enhet',
    open_integration: 'Enheter och tjänster',
    err_range: 'Värdet ligger utanför intervallet',
    err_not_found: 'Integrationen är inte konfigurerad',
    err_not_loaded: 'Integrationen körs inte',
    err_path_not_allowed: 'Sökväg utanför konfigurationsmappen',
    err_path_hidden: 'Sökväg i en dold mapp',
    err_path_not_csv: 'Inte en .csv-fil',
    err_write_failed: 'Filen kunde inte skrivas',
    err_generic: 'Något gick fel',
    st_loaded: 'Körs',
    st_setup_retry: 'Försöker igen',
    st_setup_error: 'Konfigurationen misslyckades',
    st_not_loaded: 'Stoppad',
    st_other: 'Otillgänglig',
  },
  bg: {
    title: 'Battery Monitor',
    batteries: 'Батерии',
    settings: 'Настройки',
    actions: 'Действия',
    none: 'Все още не е настроено: добавете интеграцията в Home Assistant.',
    open_add: 'Добавяне на интеграцията',
    loading: 'Зареждане…',
    f_threshold: 'Праг за слаба батерия',
    f_threshold_hint: 'Под това ниво батерията е слаба, {min}–{max} %',
    f_duration: 'Време преди известяване',
    f_duration_hint: 'Часове слаба или недостъпна, преди батерията да бъде известена, 0 = веднага, до {max} ч',
    f_morning: 'Сутрешно известие',
    f_evening: 'Вечерно известие',
    f_times_hint: 'Местно време; един и същ час два пъти изпраща едно известие',
    f_notify: 'Действия за известяване',
    f_notify_hint: 'Всяко получава известието, освен постоянното известие',
    f_ignored_integrations: 'Пренебрегнати интеграции',
    f_ignored_integrations_hint: 'Техните батерии се пропускат (по подразбиране телефоните и таблетите на мобилното приложение)',
    f_ignored_entities: 'Пренебрегнати батерии',
    f_ignored_entities_hint: 'Батерии, пропуснати една по една',
    pick: 'Добавяне…',
    no_choice: 'Няма какво повече да се добави',
    remove_chip: 'Премахване на {name}',
    u_percent: '%',
    u_hours: 'ч',
    save: 'Запазване',
    saving: 'Запазване…',
    saved: 'Запазено',
    notify: 'Извести сега',
    notifying: 'Изпращане…',
    notified: 'Известието е изпратено · за проверка: {count}',
    notified_none: 'Известието е изпратено: няма батерия за проверка',
    notified_count: 'за проверка: {count}',
    export: 'Експорт в CSV',
    exporting: 'Експортиране…',
    exported: 'CSV записан в {path} · батерии: {count}',
    f_path: 'CSV файл',
    f_path_hint: 'Празно: battery_monitor.csv в папката с конфигурацията',
    last_notification: 'Последно известие',
    never: 'Все още никога',
    open_device: 'Устройство',
    open_integration: 'Устройства и услуги',
    err_range: 'Стойност извън обхвата',
    err_not_found: 'Интеграцията не е настроена',
    err_not_loaded: 'Интеграцията не работи',
    err_path_not_allowed: 'Път извън папката с конфигурацията',
    err_path_hidden: 'Път в скрита папка',
    err_path_not_csv: 'Не е .csv файл',
    err_write_failed: 'Файлът не можа да бъде записан',
    err_generic: 'Нещо се обърка',
    st_loaded: 'Работи',
    st_setup_retry: 'Нов опит',
    st_setup_error: 'Настройката е неуспешна',
    st_not_loaded: 'Спряна',
    st_other: 'Недостъпна',
  },
  ru: {
    title: 'Battery Monitor',
    batteries: 'Батареи',
    settings: 'Настройки',
    actions: 'Действия',
    none: 'Ещё не настроено: добавьте интеграцию в Home Assistant.',
    open_add: 'Добавить интеграцию',
    loading: 'Загрузка…',
    f_threshold: 'Порог низкого заряда',
    f_threshold_hint: 'Ниже этого уровня батарея считается разряженной, {min}–{max} %',
    f_duration: 'Время до уведомления',
    f_duration_hint: 'Часы низкого заряда или недоступности до уведомления о батарее, 0 = сразу, до {max} ч',
    f_morning: 'Утреннее уведомление',
    f_evening: 'Вечернее уведомление',
    f_times_hint: 'Местное время; одно и то же время дважды отправляет одно уведомление',
    f_notify: 'Действия уведомления',
    f_notify_hint: 'Каждое получает уведомление, помимо постоянного уведомления',
    f_ignored_integrations: 'Игнорируемые интеграции',
    f_ignored_integrations_hint: 'Их батареи не учитываются (по умолчанию телефоны и планшеты мобильного приложения)',
    f_ignored_entities: 'Игнорируемые батареи',
    f_ignored_entities_hint: 'Батареи, исключённые по одной',
    pick: 'Добавить…',
    no_choice: 'Больше нечего добавить',
    remove_chip: 'Убрать {name}',
    u_percent: '%',
    u_hours: 'ч',
    save: 'Сохранить',
    saving: 'Сохранение…',
    saved: 'Сохранено',
    notify: 'Уведомить сейчас',
    notifying: 'Отправка…',
    notified: 'Уведомление отправлено · проверить: {count}',
    notified_none: 'Уведомление отправлено: батарей для проверки нет',
    notified_count: 'проверить: {count}',
    export: 'Экспорт в CSV',
    exporting: 'Экспорт…',
    exported: 'CSV записан в {path} · батарей: {count}',
    f_path: 'Файл CSV',
    f_path_hint: 'Пусто: battery_monitor.csv в папке конфигурации',
    last_notification: 'Последнее уведомление',
    never: 'Пока ни разу',
    open_device: 'Устройство',
    open_integration: 'Устройства и службы',
    err_range: 'Значение вне диапазона',
    err_not_found: 'Интеграция не настроена',
    err_not_loaded: 'Интеграция не запущена',
    err_path_not_allowed: 'Путь вне папки конфигурации',
    err_path_hidden: 'Путь в скрытой папке',
    err_path_not_csv: 'Это не файл .csv',
    err_write_failed: 'Не удалось записать файл',
    err_generic: 'Что-то пошло не так',
    st_loaded: 'Работает',
    st_setup_retry: 'Повторная попытка',
    st_setup_error: 'Ошибка настройки',
    st_not_loaded: 'Остановлена',
    st_other: 'Недоступна',
  },
  uk: {
    title: 'Battery Monitor',
    batteries: 'Батареї',
    settings: 'Налаштування',
    actions: 'Дії',
    none: 'Ще не налаштовано: додайте інтеграцію до Home Assistant.',
    open_add: 'Додати інтеграцію',
    loading: 'Завантаження…',
    f_threshold: 'Поріг низького заряду',
    f_threshold_hint: 'Нижче цього рівня батарея вважається розрядженою, {min}–{max} %',
    f_duration: 'Час до сповіщення',
    f_duration_hint: 'Години низького заряду або недоступності до сповіщення про батарею, 0 = одразу, до {max} год',
    f_morning: 'Ранкове сповіщення',
    f_evening: 'Вечірнє сповіщення',
    f_times_hint: 'Місцевий час; однаковий час двічі надсилає одне сповіщення',
    f_notify: 'Дії сповіщення',
    f_notify_hint: 'Кожна отримує сповіщення, окрім постійного сповіщення',
    f_ignored_integrations: 'Ігноровані інтеграції',
    f_ignored_integrations_hint: 'Їхні батареї не враховуються (типово телефони та планшети мобільного застосунку)',
    f_ignored_entities: 'Ігноровані батареї',
    f_ignored_entities_hint: 'Батареї, виключені по одній',
    pick: 'Додати…',
    no_choice: 'Більше нічого додати',
    remove_chip: 'Прибрати {name}',
    u_percent: '%',
    u_hours: 'год',
    save: 'Зберегти',
    saving: 'Збереження…',
    saved: 'Збережено',
    notify: 'Сповістити зараз',
    notifying: 'Надсилання…',
    notified: 'Сповіщення надіслано · перевірити: {count}',
    notified_none: 'Сповіщення надіслано: батарей для перевірки немає',
    notified_count: 'перевірити: {count}',
    export: 'Експорт у CSV',
    exporting: 'Експорт…',
    exported: 'CSV записано в {path} · батарей: {count}',
    f_path: 'Файл CSV',
    f_path_hint: 'Порожньо: battery_monitor.csv у теці конфігурації',
    last_notification: 'Останнє сповіщення',
    never: 'Поки жодного',
    open_device: 'Пристрій',
    open_integration: 'Пристрої та служби',
    err_range: 'Значення поза діапазоном',
    err_not_found: 'Інтеграцію не налаштовано',
    err_not_loaded: 'Інтеграція не запущена',
    err_path_not_allowed: 'Шлях поза текою конфігурації',
    err_path_hidden: 'Шлях у прихованій теці',
    err_path_not_csv: 'Це не файл .csv',
    err_write_failed: 'Не вдалося записати файл',
    err_generic: 'Щось пішло не так',
    st_loaded: 'Працює',
    st_setup_retry: 'Повторна спроба',
    st_setup_error: 'Помилка налаштування',
    st_not_loaded: 'Зупинена',
    st_other: 'Недоступна',
  },
  hu: {
    title: 'Battery Monitor',
    batteries: 'Akkumulátorok',
    settings: 'Beállítások',
    actions: 'Műveletek',
    none: 'Még nincs beállítva: adja hozzá az integrációt a Home Assistanthoz.',
    open_add: 'Integráció hozzáadása',
    loading: 'Betöltés…',
    f_threshold: 'Alacsony töltöttség küszöbe',
    f_threshold_hint: 'E szint alatt az akkumulátor alacsony, {min}–{max} %',
    f_duration: 'Időtartam az értesítés előtt',
    f_duration_hint: 'Órák alacsonyan vagy elérhetetlenül, mielőtt az akkumulátorról értesítés megy, 0 = azonnal, legfeljebb {max} ó',
    f_morning: 'Reggeli értesítés',
    f_evening: 'Esti értesítés',
    f_times_hint: 'Helyi idő; ugyanaz az időpont kétszer egy értesítést küld',
    f_notify: 'Értesítési műveletek',
    f_notify_hint: 'Mindegyik megkapja az értesítést, az állandó értesítésen felül',
    f_ignored_integrations: 'Figyelmen kívül hagyott integrációk',
    f_ignored_integrations_hint: 'Az akkumulátoraik kimaradnak (alapértelmezésben a mobilalkalmazás telefonjai és táblagépei)',
    f_ignored_entities: 'Figyelmen kívül hagyott akkumulátorok',
    f_ignored_entities_hint: 'Egyenként kihagyott akkumulátorok',
    pick: 'Hozzáadás…',
    no_choice: 'Nincs több hozzáadnivaló',
    remove_chip: '{name} eltávolítása',
    u_percent: '%',
    u_hours: 'ó',
    save: 'Mentés',
    saving: 'Mentés…',
    saved: 'Mentve',
    notify: 'Értesítés most',
    notifying: 'Küldés…',
    notified: 'Értesítés elküldve · ellenőrizendő: {count}',
    notified_none: 'Értesítés elküldve: nincs ellenőrizendő akkumulátor',
    notified_count: 'ellenőrizendő: {count}',
    export: 'CSV exportálása',
    exporting: 'Exportálás…',
    exported: 'CSV kiírva ide: {path} · akkumulátorok: {count}',
    f_path: 'CSV-fájl',
    f_path_hint: 'Üresen: battery_monitor.csv a konfigurációs mappában',
    last_notification: 'Utolsó értesítés',
    never: 'Még soha',
    open_device: 'Eszköz',
    open_integration: 'Eszközök és szolgáltatások',
    err_range: 'Az érték a tartományon kívül esik',
    err_not_found: 'Az integráció nincs beállítva',
    err_not_loaded: 'Az integráció nem fut',
    err_path_not_allowed: 'Az útvonal a konfigurációs mappán kívül van',
    err_path_hidden: 'Az útvonal rejtett mappában van',
    err_path_not_csv: 'Nem .csv fájl',
    err_write_failed: 'A fájlt nem sikerült kiírni',
    err_generic: 'Valami hiba történt',
    st_loaded: 'Fut',
    st_setup_retry: 'Újrapróbálás',
    st_setup_error: 'A beállítás sikertelen',
    st_not_loaded: 'Leállítva',
    st_other: 'Nem érhető el',
  },
  sk: {
    title: 'Battery Monitor',
    batteries: 'Batérie',
    settings: 'Nastavenia',
    actions: 'Akcie',
    none: 'Zatiaľ nenastavené: pridajte integráciu do Home Assistant.',
    open_add: 'Pridať integráciu',
    loading: 'Načítava sa…',
    f_threshold: 'Prah slabej batérie',
    f_threshold_hint: 'Pod touto úrovňou je batéria slabá, {min}–{max} %',
    f_duration: 'Čas pred upozornením',
    f_duration_hint: 'Hodiny slabej alebo nedostupnej batérie pred upozornením, 0 = hneď, najviac {max} h',
    f_morning: 'Ranné upozornenie',
    f_evening: 'Večerné upozornenie',
    f_times_hint: 'Miestny čas; rovnaký čas dvakrát pošle jedno upozornenie',
    f_notify: 'Akcie upozornení',
    f_notify_hint: 'Každá dostane upozornenie, okrem trvalého upozornenia',
    f_ignored_integrations: 'Ignorované integrácie',
    f_ignored_integrations_hint: 'Ich batérie sa vynechajú (predvolene telefóny a tablety mobilnej aplikácie)',
    f_ignored_entities: 'Ignorované batérie',
    f_ignored_entities_hint: 'Batérie vynechané jednotlivo',
    pick: 'Pridať…',
    no_choice: 'Už nie je čo pridať',
    remove_chip: 'Odstrániť {name}',
    u_percent: '%',
    u_hours: 'h',
    save: 'Uložiť',
    saving: 'Ukladá sa…',
    saved: 'Uložené',
    notify: 'Upozorniť teraz',
    notifying: 'Odosiela sa…',
    notified: 'Upozornenie odoslané · na kontrolu: {count}',
    notified_none: 'Upozornenie odoslané: žiadna batéria na kontrolu',
    notified_count: 'na kontrolu: {count}',
    export: 'Exportovať CSV',
    exporting: 'Exportuje sa…',
    exported: 'CSV zapísané do {path} · batérie: {count}',
    f_path: 'Súbor CSV',
    f_path_hint: 'Prázdne: battery_monitor.csv v priečinku konfigurácie',
    last_notification: 'Posledné upozornenie',
    never: 'Zatiaľ nikdy',
    open_device: 'Zariadenie',
    open_integration: 'Zariadenia a služby',
    err_range: 'Hodnota mimo rozsahu',
    err_not_found: 'Integrácia nie je nastavená',
    err_not_loaded: 'Integrácia nebeží',
    err_path_not_allowed: 'Cesta mimo priečinka konfigurácie',
    err_path_hidden: 'Cesta v skrytom priečinku',
    err_path_not_csv: 'Nie je to súbor .csv',
    err_write_failed: 'Súbor sa nepodarilo zapísať',
    err_generic: 'Niečo sa pokazilo',
    st_loaded: 'Beží',
    st_setup_retry: 'Skúša sa znova',
    st_setup_error: 'Nastavenie zlyhalo',
    st_not_loaded: 'Zastavená',
    st_other: 'Nedostupná',
  },
  cs: {
    title: 'Battery Monitor',
    batteries: 'Baterie',
    settings: 'Nastavení',
    actions: 'Akce',
    none: 'Zatím nenastaveno: přidejte integraci do Home Assistant.',
    open_add: 'Přidat integraci',
    loading: 'Načítání…',
    f_threshold: 'Práh slabé baterie',
    f_threshold_hint: 'Pod touto úrovní je baterie slabá, {min}–{max} %',
    f_duration: 'Doba před upozorněním',
    f_duration_hint: 'Hodiny slabé nebo nedostupné baterie před upozorněním, 0 = hned, nejvýše {max} h',
    f_morning: 'Ranní upozornění',
    f_evening: 'Večerní upozornění',
    f_times_hint: 'Místní čas; stejný čas dvakrát pošle jedno upozornění',
    f_notify: 'Akce upozornění',
    f_notify_hint: 'Každá dostane upozornění, kromě trvalého upozornění',
    f_ignored_integrations: 'Ignorované integrace',
    f_ignored_integrations_hint: 'Jejich baterie se vynechají (výchozí telefony a tablety mobilní aplikace)',
    f_ignored_entities: 'Ignorované baterie',
    f_ignored_entities_hint: 'Baterie vynechané jednotlivě',
    pick: 'Přidat…',
    no_choice: 'Už není co přidat',
    remove_chip: 'Odebrat {name}',
    u_percent: '%',
    u_hours: 'h',
    save: 'Uložit',
    saving: 'Ukládání…',
    saved: 'Uloženo',
    notify: 'Upozornit nyní',
    notifying: 'Odesílání…',
    notified: 'Upozornění odesláno · ke kontrole: {count}',
    notified_none: 'Upozornění odesláno: žádná baterie ke kontrole',
    notified_count: 'ke kontrole: {count}',
    export: 'Exportovat CSV',
    exporting: 'Exportování…',
    exported: 'CSV zapsáno do {path} · baterie: {count}',
    f_path: 'Soubor CSV',
    f_path_hint: 'Prázdné: battery_monitor.csv ve složce konfigurace',
    last_notification: 'Poslední upozornění',
    never: 'Zatím nikdy',
    open_device: 'Zařízení',
    open_integration: 'Zařízení a služby',
    err_range: 'Hodnota mimo rozsah',
    err_not_found: 'Integrace není nastavena',
    err_not_loaded: 'Integrace neběží',
    err_path_not_allowed: 'Cesta mimo složku konfigurace',
    err_path_hidden: 'Cesta ve skryté složce',
    err_path_not_csv: 'Není to soubor .csv',
    err_write_failed: 'Soubor se nepodařilo zapsat',
    err_generic: 'Něco se pokazilo',
    st_loaded: 'Běží',
    st_setup_retry: 'Zkouší se znovu',
    st_setup_error: 'Nastavení selhalo',
    st_not_loaded: 'Zastavena',
    st_other: 'Nedostupná',
  },
  sl: {
    title: 'Battery Monitor',
    batteries: 'Baterije',
    settings: 'Nastavitve',
    actions: 'Dejanja',
    none: 'Še ni nastavljeno: dodajte integracijo v Home Assistant.',
    open_add: 'Dodaj integracijo',
    loading: 'Nalaganje…',
    f_threshold: 'Prag šibke baterije',
    f_threshold_hint: 'Pod to ravnjo je baterija šibka, {min}–{max} %',
    f_duration: 'Trajanje pred obvestilom',
    f_duration_hint: 'Ure šibke ali nedosegljive baterije pred obvestilom, 0 = takoj, največ {max} h',
    f_morning: 'Jutranje obvestilo',
    f_evening: 'Večerno obvestilo',
    f_times_hint: 'Lokalni čas; isti čas dvakrat pošlje eno obvestilo',
    f_notify: 'Dejanja obveščanja',
    f_notify_hint: 'Vsako prejme obvestilo, poleg trajnega obvestila',
    f_ignored_integrations: 'Prezrte integracije',
    f_ignored_integrations_hint: 'Njihove baterije so izpuščene (privzeto telefoni in tablice mobilne aplikacije)',
    f_ignored_entities: 'Prezrte baterije',
    f_ignored_entities_hint: 'Baterije, izpuščene ena po ena',
    pick: 'Dodaj…',
    no_choice: 'Ničesar več za dodati',
    remove_chip: 'Odstrani {name}',
    u_percent: '%',
    u_hours: 'h',
    save: 'Shrani',
    saving: 'Shranjevanje…',
    saved: 'Shranjeno',
    notify: 'Obvesti zdaj',
    notifying: 'Pošiljanje…',
    notified: 'Obvestilo poslano · za preverjanje: {count}',
    notified_none: 'Obvestilo poslano: nobene baterije za preverjanje',
    notified_count: 'za preverjanje: {count}',
    export: 'Izvozi CSV',
    exporting: 'Izvažanje…',
    exported: 'CSV zapisan v {path} · baterije: {count}',
    f_path: 'Datoteka CSV',
    f_path_hint: 'Prazno: battery_monitor.csv v mapi s konfiguracijo',
    last_notification: 'Zadnje obvestilo',
    never: 'Še nikoli',
    open_device: 'Naprava',
    open_integration: 'Naprave in storitve',
    err_range: 'Vrednost zunaj obsega',
    err_not_found: 'Integracija ni nastavljena',
    err_not_loaded: 'Integracija ne teče',
    err_path_not_allowed: 'Pot zunaj mape s konfiguracijo',
    err_path_hidden: 'Pot v skriti mapi',
    err_path_not_csv: 'To ni datoteka .csv',
    err_write_failed: 'Datoteke ni bilo mogoče zapisati',
    err_generic: 'Nekaj je šlo narobe',
    st_loaded: 'Teče',
    st_setup_retry: 'Ponovni poskus',
    st_setup_error: 'Nastavitev ni uspela',
    st_not_loaded: 'Ustavljena',
    st_other: 'Nedosegljiva',
  },
  lv: {
    title: 'Battery Monitor',
    batteries: 'Baterijas',
    settings: 'Iestatījumi',
    actions: 'Darbības',
    none: 'Vēl nav iestatīts: pievienojiet integrāciju Home Assistant.',
    open_add: 'Pievienot integrāciju',
    loading: 'Ielādē…',
    f_threshold: 'Zema baterijas līmeņa slieksnis',
    f_threshold_hint: 'Zem šī līmeņa baterija ir zema, {min}–{max} %',
    f_duration: 'Ilgums pirms paziņojuma',
    f_duration_hint: 'Stundas zema vai nepieejama pirms paziņojuma par bateriju, 0 = uzreiz, līdz {max} h',
    f_morning: 'Rīta paziņojums',
    f_evening: 'Vakara paziņojums',
    f_times_hint: 'Vietējais laiks; viens un tas pats laiks divreiz nosūta vienu paziņojumu',
    f_notify: 'Paziņojumu darbības',
    f_notify_hint: 'Katra saņem paziņojumu papildus pastāvīgajam paziņojumam',
    f_ignored_integrations: 'Ignorētās integrācijas',
    f_ignored_integrations_hint: 'To baterijas netiek ņemtas vērā (pēc noklusējuma mobilās lietotnes tālruņi un planšetes)',
    f_ignored_entities: 'Ignorētās baterijas',
    f_ignored_entities_hint: 'Pa vienai izlaistās baterijas',
    pick: 'Pievienot…',
    no_choice: 'Nav vairs ko pievienot',
    remove_chip: 'Noņemt {name}',
    u_percent: '%',
    u_hours: 'h',
    save: 'Saglabāt',
    saving: 'Saglabā…',
    saved: 'Saglabāts',
    notify: 'Paziņot tagad',
    notifying: 'Sūta…',
    notified: 'Paziņojums nosūtīts · jāpārbauda: {count}',
    notified_none: 'Paziņojums nosūtīts: nav baterijas, kas jāpārbauda',
    notified_count: 'jāpārbauda: {count}',
    export: 'Eksportēt CSV',
    exporting: 'Eksportē…',
    exported: 'CSV ierakstīts {path} · baterijas: {count}',
    f_path: 'CSV fails',
    f_path_hint: 'Tukšs: battery_monitor.csv konfigurācijas mapē',
    last_notification: 'Pēdējais paziņojums',
    never: 'Vēl nekad',
    open_device: 'Ierīce',
    open_integration: 'Ierīces un pakalpojumi',
    err_range: 'Vērtība ārpus diapazona',
    err_not_found: 'Integrācija nav iestatīta',
    err_not_loaded: 'Integrācija nedarbojas',
    err_path_not_allowed: 'Ceļš ārpus konfigurācijas mapes',
    err_path_hidden: 'Ceļš slēptā mapē',
    err_path_not_csv: 'Tas nav .csv fails',
    err_write_failed: 'Failu neizdevās ierakstīt',
    err_generic: 'Kaut kas nogāja greizi',
    st_loaded: 'Darbojas',
    st_setup_retry: 'Mēģina vēlreiz',
    st_setup_error: 'Iestatīšana neizdevās',
    st_not_loaded: 'Apturēta',
    st_other: 'Nav pieejama',
  },
  el: {
    title: 'Battery Monitor',
    batteries: 'Μπαταρίες',
    settings: 'Ρυθμίσεις',
    actions: 'Ενέργειες',
    none: 'Δεν έχει ρυθμιστεί ακόμη: προσθέστε την ενσωμάτωση στο Home Assistant.',
    open_add: 'Προσθήκη της ενσωμάτωσης',
    loading: 'Φόρτωση…',
    f_threshold: 'Όριο χαμηλής μπαταρίας',
    f_threshold_hint: 'Κάτω από αυτό το επίπεδο η μπαταρία είναι χαμηλή, {min}–{max} %',
    f_duration: 'Διάρκεια πριν την ειδοποίηση',
    f_duration_hint: 'Ώρες χαμηλή ή μη διαθέσιμη πριν ειδοποιηθεί μια μπαταρία, 0 = αμέσως, έως {max} ώ',
    f_morning: 'Πρωινή ειδοποίηση',
    f_evening: 'Βραδινή ειδοποίηση',
    f_times_hint: 'Τοπική ώρα· η ίδια ώρα δύο φορές στέλνει μία ειδοποίηση',
    f_notify: 'Ενέργειες ειδοποίησης',
    f_notify_hint: 'Καθεμία λαμβάνει την ειδοποίηση, πέρα από τη μόνιμη ειδοποίηση',
    f_ignored_integrations: 'Ενσωματώσεις που αγνοούνται',
    f_ignored_integrations_hint: 'Οι μπαταρίες τους παραλείπονται (από προεπιλογή τα τηλέφωνα και τα tablet της εφαρμογής κινητού)',
    f_ignored_entities: 'Μπαταρίες που αγνοούνται',
    f_ignored_entities_hint: 'Μπαταρίες που παραλείπονται μία προς μία',
    pick: 'Προσθήκη…',
    no_choice: 'Δεν υπάρχει τίποτα άλλο να προστεθεί',
    remove_chip: 'Αφαίρεση {name}',
    u_percent: '%',
    u_hours: 'ώ',
    save: 'Αποθήκευση',
    saving: 'Αποθήκευση…',
    saved: 'Αποθηκεύτηκε',
    notify: 'Ειδοποίηση τώρα',
    notifying: 'Αποστολή…',
    notified: 'Η ειδοποίηση στάλθηκε · για έλεγχο: {count}',
    notified_none: 'Η ειδοποίηση στάλθηκε: καμία μπαταρία για έλεγχο',
    notified_count: 'για έλεγχο: {count}',
    export: 'Εξαγωγή CSV',
    exporting: 'Εξαγωγή…',
    exported: 'Το CSV γράφτηκε στο {path} · μπαταρίες: {count}',
    f_path: 'Αρχείο CSV',
    f_path_hint: 'Κενό: battery_monitor.csv στον φάκελο ρυθμίσεων',
    last_notification: 'Τελευταία ειδοποίηση',
    never: 'Ποτέ ακόμη',
    open_device: 'Συσκευή',
    open_integration: 'Συσκευές και υπηρεσίες',
    err_range: 'Τιμή εκτός ορίων',
    err_not_found: 'Η ενσωμάτωση δεν έχει ρυθμιστεί',
    err_not_loaded: 'Η ενσωμάτωση δεν εκτελείται',
    err_path_not_allowed: 'Διαδρομή εκτός του φακέλου ρυθμίσεων',
    err_path_hidden: 'Διαδρομή σε κρυφό φάκελο',
    err_path_not_csv: 'Δεν είναι αρχείο .csv',
    err_write_failed: 'Δεν ήταν δυνατή η εγγραφή του αρχείου',
    err_generic: 'Κάτι πήγε στραβά',
    st_loaded: 'Σε λειτουργία',
    st_setup_retry: 'Νέα προσπάθεια',
    st_setup_error: 'Η ρύθμιση απέτυχε',
    st_not_loaded: 'Σταματημένη',
    st_other: 'Μη διαθέσιμη',
  },
  sr: {
    title: 'Battery Monitor',
    batteries: 'Батерије',
    settings: 'Подешавања',
    actions: 'Радње',
    none: 'Још није подешено: додајте интеграцију у Home Assistant.',
    open_add: 'Додај интеграцију',
    loading: 'Учитавање…',
    f_threshold: 'Праг слабе батерије',
    f_threshold_hint: 'Испод овог нивоа батерија је слаба, {min}–{max} %',
    f_duration: 'Трајање пре обавештења',
    f_duration_hint: 'Сати слабе или недоступне батерије пре обавештења, 0 = одмах, највише {max} ч',
    f_morning: 'Јутарње обавештење',
    f_evening: 'Вечерње обавештење',
    f_times_hint: 'Локално време; исто време два пута шаље једно обавештење',
    f_notify: 'Радње обавештавања',
    f_notify_hint: 'Свака прима обавештење, поред трајног обавештења',
    f_ignored_integrations: 'Занемарене интеграције',
    f_ignored_integrations_hint: 'Њихове батерије се изостављају (подразумевано телефони и таблети мобилне апликације)',
    f_ignored_entities: 'Занемарене батерије',
    f_ignored_entities_hint: 'Батерије изостављене једна по једна',
    pick: 'Додај…',
    no_choice: 'Нема више шта да се дода',
    remove_chip: 'Уклони {name}',
    u_percent: '%',
    u_hours: 'ч',
    save: 'Сачувај',
    saving: 'Чување…',
    saved: 'Сачувано',
    notify: 'Обавести сада',
    notifying: 'Слање…',
    notified: 'Обавештење послато · за проверу: {count}',
    notified_none: 'Обавештење послато: нема батерије за проверу',
    notified_count: 'за проверу: {count}',
    export: 'Извези CSV',
    exporting: 'Извоз…',
    exported: 'CSV уписан у {path} · батерије: {count}',
    f_path: 'CSV датотека',
    f_path_hint: 'Празно: battery_monitor.csv у фасцикли са подешавањима',
    last_notification: 'Последње обавештење',
    never: 'Још никада',
    open_device: 'Уређај',
    open_integration: 'Уређаји и услуге',
    err_range: 'Вредност ван опсега',
    err_not_found: 'Интеграција није подешена',
    err_not_loaded: 'Интеграција не ради',
    err_path_not_allowed: 'Путања ван фасцикле са подешавањима',
    err_path_hidden: 'Путања у скривеној фасцикли',
    err_path_not_csv: 'Није .csv датотека',
    err_write_failed: 'Датотека није могла бити уписана',
    err_generic: 'Нешто је пошло наопако',
    st_loaded: 'Ради',
    st_setup_retry: 'Поновни покушај',
    st_setup_error: 'Подешавање није успело',
    st_not_loaded: 'Заустављена',
    st_other: 'Недоступна',
  },
  'sr-Latn': {
    title: 'Battery Monitor',
    batteries: 'Baterije',
    settings: 'Podešavanja',
    actions: 'Radnje',
    none: 'Još nije podešeno: dodajte integraciju u Home Assistant.',
    open_add: 'Dodaj integraciju',
    loading: 'Učitavanje…',
    f_threshold: 'Prag slabe baterije',
    f_threshold_hint: 'Ispod ovog nivoa baterija je slaba, {min}–{max} %',
    f_duration: 'Trajanje pre obaveštenja',
    f_duration_hint: 'Sati slabe ili nedostupne baterije pre obaveštenja, 0 = odmah, najviše {max} č',
    f_morning: 'Jutarnje obaveštenje',
    f_evening: 'Večernje obaveštenje',
    f_times_hint: 'Lokalno vreme; isto vreme dva puta šalje jedno obaveštenje',
    f_notify: 'Radnje obaveštavanja',
    f_notify_hint: 'Svaka prima obaveštenje, pored trajnog obaveštenja',
    f_ignored_integrations: 'Zanemarene integracije',
    f_ignored_integrations_hint: 'Njihove baterije se izostavljaju (podrazumevano telefoni i tableti mobilne aplikacije)',
    f_ignored_entities: 'Zanemarene baterije',
    f_ignored_entities_hint: 'Baterije izostavljene jedna po jedna',
    pick: 'Dodaj…',
    no_choice: 'Nema više šta da se doda',
    remove_chip: 'Ukloni {name}',
    u_percent: '%',
    u_hours: 'č',
    save: 'Sačuvaj',
    saving: 'Čuvanje…',
    saved: 'Sačuvano',
    notify: 'Obavesti sada',
    notifying: 'Slanje…',
    notified: 'Obaveštenje poslato · za proveru: {count}',
    notified_none: 'Obaveštenje poslato: nema baterije za proveru',
    notified_count: 'za proveru: {count}',
    export: 'Izvezi CSV',
    exporting: 'Izvoz…',
    exported: 'CSV upisan u {path} · baterije: {count}',
    f_path: 'CSV datoteka',
    f_path_hint: 'Prazno: battery_monitor.csv u fascikli sa podešavanjima',
    last_notification: 'Poslednje obaveštenje',
    never: 'Još nikada',
    open_device: 'Uređaj',
    open_integration: 'Uređaji i usluge',
    err_range: 'Vrednost van opsega',
    err_not_found: 'Integracija nije podešena',
    err_not_loaded: 'Integracija ne radi',
    err_path_not_allowed: 'Putanja van fascikle sa podešavanjima',
    err_path_hidden: 'Putanja u skrivenoj fascikli',
    err_path_not_csv: 'Nije .csv datoteka',
    err_write_failed: 'Datoteka nije mogla biti upisana',
    err_generic: 'Nešto je pošlo naopako',
    st_loaded: 'Radi',
    st_setup_retry: 'Ponovni pokušaj',
    st_setup_error: 'Podešavanje nije uspelo',
    st_not_loaded: 'Zaustavljena',
    st_other: 'Nedostupna',
  },
};

// Option limits, filled in from the settings command (the Python constants are the reference)
var BM_PANEL_LIMITS = { threshold: [1, 99], duration: [0, 720] };
var BM_PANEL_LISTS = ['notify_services', 'ignored_integrations', 'ignored_entities'];
var BM_PANEL_TABS = ['batteries', 'actions', 'settings'];

function bmPanelT(lang, key, vars) {
  var table = BatteryMonitorPanelI18n[lang] || BatteryMonitorPanelI18n.en;
  var text = table[key] || BatteryMonitorPanelI18n.en[key] || key;
  Object.entries(vars || {}).forEach(([k, v]) => {
    text = text.replace(`{${k}}`, v);
  });
  return text;
}

function bmPanelEsc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

// Tone of the config entry state, for its pill
function bmPanelTone(state) {
  if (state === 'loaded') return 'good';
  if (state === 'setup_retry' || state === 'not_loaded') return 'warn';
  return 'bad';
}

// "HH:MM" of a stored time ("09:00:00"), what a time input takes
function bmPanelClock(value) {
  return String(value || '').slice(0, 5);
}

function bmPanelSameList(a, b) {
  return JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());
}

class BatteryMonitorPanel extends HTMLElement {
  static STYLE = `
    :host { display:block; min-height:100%; background:var(--primary-background-color); color:var(--primary-text-color);
            --tone-good: var(--success-color, #43a047); --tone-warn: var(--warning-color, #ffa600); --tone-bad: var(--error-color, #db4437); }
    .toolbar { height:var(--header-height, 56px); display:flex; align-items:center; gap:8px; padding:0 12px; box-sizing:border-box;
               background:var(--app-header-background-color, var(--primary-color)); color:var(--app-header-text-color, #fff);
               border-bottom:var(--app-header-border-bottom, none); font-size:20px; position:sticky; top:0; z-index:2; }
    .toolbar .grow { flex:1; }
    .toolbar a { color:inherit; display:flex; padding:8px; border-radius:50%; --mdc-icon-size:22px; }
    .toolbar a:hover { background:rgba(255,255,255,.12); }
    /* Tabs under the toolbar, as in Smart Comfort: text, the active one underlined, sticky with the toolbar */
    .tabs { display:flex; gap:4px; padding:0 12px; overflow-x:auto; background:var(--app-header-background-color, var(--primary-color));
            position:sticky; top:var(--header-height, 56px); z-index:2; }
    .tab { background:none; border:none; border-bottom:2px solid transparent; color:var(--app-header-text-color, #fff); opacity:.75;
           padding:12px 14px; font:inherit; font-size:14px; cursor:pointer; white-space:nowrap; }
    .tab:hover, .tab:focus-visible { opacity:1; outline:none; }
    .tab.active { opacity:1; border-bottom-color:var(--app-header-text-color, #fff); }
    main { max-width:1040px; margin:0 auto; padding:16px; box-sizing:border-box; }
    section[hidden] { display:none; }
    .column { display:flex; flex-direction:column; gap:12px; min-width:0; }
    .note { padding:16px; color:var(--secondary-text-color); display:flex; flex-direction:column; gap:10px; align-items:flex-start; }
    .block { padding:14px 16px; display:flex; flex-direction:column; gap:12px; }
    .head { display:flex; align-items:center; gap:12px; }
    .avatar { width:40px; height:40px; flex:none; border-radius:50%; display:grid; place-items:center; --mdc-icon-size:22px;
              color:var(--primary-color); background:color-mix(in srgb, var(--primary-color) 15%, transparent); }
    .who { flex:1; min-width:0; }
    .who .n { font-size:16px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .who .s { font-size:12px; color:var(--secondary-text-color); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .pill { flex:none; font-size:11px; font-weight:500; padding:2px 10px; border-radius:12px; color:var(--tone-text); background:color-mix(in srgb, var(--tone) 15%, transparent); }
    .good { --tone:var(--tone-good); } .warn { --tone:var(--tone-warn); } .bad { --tone:var(--tone-bad); }
    /* Text in a state colour: half-way to the text colour, so it stays readable (4.5:1) in light and dark themes */
    .good, .warn, .bad { --tone-text: color-mix(in srgb, var(--tone) 50%, var(--primary-text-color)); }
    .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(190px, 1fr)); gap:10px 14px; }
    .wide { grid-column:1 / -1; }
    .ctl { display:flex; flex-direction:column; gap:4px; min-width:0; }
    .ctl > span { font-size:12px; color:var(--secondary-text-color); }
    .ctl small { font-size:11px; color:var(--secondary-text-color); opacity:.85; }
    .box { display:flex; align-items:center; border-radius:8px; border:1px solid var(--divider-color, rgba(127,127,127,.3));
           background:var(--secondary-background-color, rgba(127,127,127,.08)); }
    .box:focus-within { border-color:var(--primary-color); }
    .box.bad-value { border-color:var(--tone-bad); }
    .box input, .box select { flex:1; min-width:0; border:0; outline:0; background:none; color:inherit; font:inherit; font-size:14px; padding:8px 10px; }
    .box select option { color:initial; }
    /* The native picker icon does not follow the theme: hidden, stretched over the whole box so a click anywhere opens
       the picker; a themed clock icon stands in for it */
    .box.time { position:relative; }
    .box input[type="time"]::-webkit-calendar-picker-indicator { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; }
    .box em ha-icon { --mdc-icon-size:18px; display:flex; }
    .box em { font-style:normal; font-size:12px; color:var(--secondary-text-color); padding-right:10px; }
    .chips { display:flex; flex-wrap:wrap; gap:6px; }
    .chip { display:inline-flex; align-items:center; gap:4px; max-width:100%; font-size:13px; padding:3px 4px 3px 10px; border-radius:14px;
            background:color-mix(in srgb, var(--primary-color) 12%, transparent); }
    .chip > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .chip small { font-size:11px; color:var(--secondary-text-color); white-space:nowrap; }
    .chip button { border:0; background:none; cursor:pointer; color:var(--secondary-text-color); padding:2px; border-radius:50%; display:flex; --mdc-icon-size:16px; }
    .chip button:hover { background:color-mix(in srgb, var(--primary-color) 18%, transparent); color:var(--primary-color); }
    .bar { display:flex; align-items:center; flex-wrap:wrap; gap:8px; border-top:1px solid var(--divider-color, rgba(127,127,127,.2)); padding-top:10px; }
    .bar .links { flex:1; display:flex; gap:4px; flex-wrap:wrap; align-items:center; }
    .bar .links a { font-size:12px; color:var(--secondary-text-color); text-decoration:none; display:inline-flex; align-items:center; gap:4px;
                    padding:4px 8px; border-radius:8px; --mdc-icon-size:15px; }
    .bar .links a:hover { background:var(--secondary-background-color); color:var(--primary-text-color); }
    .msg { font-size:12px; color:var(--secondary-text-color); overflow-wrap:anywhere; }
    .msg.good, .msg.bad { color:var(--tone-text); }
    .act { display:inline-flex; align-items:center; gap:6px; border:0; cursor:pointer; font:inherit; font-size:13px; font-weight:500;
           padding:7px 12px; border-radius:8px; --mdc-icon-size:16px; color:var(--primary-color);
           background:color-mix(in srgb, var(--primary-color) 14%, transparent); }
    .act:hover:not([disabled]) { background:color-mix(in srgb, var(--primary-color) 22%, transparent); }
    .act.quiet { color:var(--primary-text-color); background:var(--secondary-background-color, rgba(127,127,127,.12)); }
    .act[disabled] { opacity:.5; cursor:default; }
    .row { display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap; }
    .row .ctl { flex:1; min-width:200px; }
  `;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._settings = null;
    // Fields the user edited: the rest of the form always shows the stored values
    this._drafts = {};
    this._status = {};
    this._busy = null;
    this._exportPath = '';
    this._tab = 'batteries';
  }

  // /battery-monitor/<tab> opens that tab (Home Assistant sets the route; the base address is Batteries)
  set route(route) {
    var path = (route?.path || '').split('/').filter(Boolean)[0];
    var tab = BM_PANEL_TABS.includes(path) ? path : 'batteries';
    if (tab !== this._tab) this._showTab(tab);
  }

  // Shows a tab; `focus` moves the keyboard to its button (arrow keys). The address follows, so a reload or a link
  // comes back to the same tab.
  _goTab(tab, focus) {
    if (!BM_PANEL_TABS.includes(tab)) return;
    this._showTab(tab, focus);
    var base = (this._panel?.url_path || 'battery-monitor').replace(/^\//, '');
    try {
      history.replaceState(history.state, '', `/${base}${tab === 'batteries' ? '' : `/${tab}`}`);
    } catch (_err) {
      // no history (a test, a sandboxed page): the tab still shows
    }
  }

  _showTab(tab, focus) {
    this._tab = tab;
    var root = this.shadowRoot;
    root.querySelectorAll?.('.tab').forEach((button) => {
      var selected = button.dataset.tab === tab;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus({ preventScroll: true });
    });
    BM_PANEL_TABS.forEach((name) => {
      var panel = root.getElementById(`tab-${name}`);
      if (panel) panel.hidden = name !== tab;
    });
  }

  set hass(hass) {
    var first = !this._hass;
    var langBefore = this._lang();
    this._hass = hass;
    if (this._card) this._card.hass = hass;
    if (this._menu) this._menu.hass = hass;
    if (first) this._start();
    else if (this._lang() !== langBefore) this._render();
  }

  set narrow(narrow) {
    this._narrow = narrow;
    if (this._menu) this._menu.narrow = narrow;
  }

  set panel(panel) {
    this._panel = panel;
  }

  connectedCallback() {
    if (this._hass && !this._unsub) this._subscribe();
    this._watchConnection(true);
    // Back on the panel after a failed load: try again now.
    if (this._hass && this._failed) this._reload();
  }

  disconnectedCallback() {
    this._watchConnection(false);
    clearTimeout(this._retryTimer);
    if (this._unsub) {
      this._unsub.then((off) => off()).catch(() => {});
      this._unsub = null;
    }
  }


  // The connection back (Home Assistant restarted, the app resumed): load again, the data may have changed meanwhile.
  _watchConnection(on) {
    var connection = this._hass?.connection;
    if (!connection?.addEventListener) return;
    this._onReady = this._onReady || (() => this._reload());
    connection.removeEventListener('ready', this._onReady);
    if (on) connection.addEventListener('ready', this._onReady);
  }

  // A load that failed (Home Assistant still starting, the connection dropped) is tried again after 2 s, 5 s, 15 s,
  // then every 30 s while the panel is shown, instead of leaving it empty.
  _retry(failed) {
    clearTimeout(this._retryTimer);
    this._failed = failed;
    if (!failed) {
      this._retries = 0;
      return;
    }
    var delay = [2000, 5000, 15000, 30000][Math.min(this._retries || 0, 3)];
    this._retries = (this._retries || 0) + 1;
    this._retryTimer = setTimeout(() => {
      if (this.isConnected) this._reload();
    }, delay);
  }

  _reload() {
    this._load();
  }
  // Full code when it has a table (sr-Latn), else its base (de-AT → de), else English
  _lang() {
    var code = this._hass?.language || 'en';
    if (BatteryMonitorPanelI18n[code]) return code;
    var base = code.split('-')[0];
    return BatteryMonitorPanelI18n[base] ? base : 'en';
  }

  _t(key, vars) {
    return bmPanelT(this._lang(), key, vars);
  }

  async _start() {
    this._render();
    var version = this._panel?.config?.version || BATTERY_MONITOR_PANEL_VERSION;
    try {
      if (!customElements.get('battery-monitor-card')) await import(`/battery_monitor/battery-monitor-card.js?v=${version}`);
    } catch (err) {
      console.error('Battery Monitor panel: could not load the card', err);
    }
    this._mountCard();
    this._subscribe();
    this._watchConnection(this.isConnected);
    this._load();
  }

  // Reload the settings when the entry is added, removed, reloaded (options changed elsewhere) or changes state
  _subscribe() {
    if (this._unsub || !this._hass?.connection) return;
    this._unsub = this._hass.connection
      .subscribeMessage(
        (events) => {
          if ([].concat(events || []).some((ev) => ev?.entry?.domain === 'battery_monitor')) this._load();
        },
        { type: 'config_entries/subscribe', type_filter: ['service'] },
      )
      .catch(() => () => {});
  }

  async _load() {
    try {
      this._settings = await this._hass.callWS({ type: 'battery_monitor/settings' });
      Object.assign(BM_PANEL_LIMITS, this._settings.limits || {});
      this._retry(false);
    } catch (err) {
      console.error('Battery Monitor panel: could not load the settings', err);
      this._retry(true);
      this._settings = this._settings || { entry: null, options: {}, notify_options: [], integration_options: [], entity_options: [] };
    }
    this._renderSettings();
  }

  _render() {
    var root = this.shadowRoot;
    var esc = bmPanelEsc;
    root.innerHTML = `
      <style>${BatteryMonitorPanel.STYLE}</style>
      <div class="toolbar">
        <ha-menu-button></ha-menu-button>
        <span class="grow">${esc(this._t('title'))}</span>
        <a href="/config/integrations/integration/battery_monitor" title="${esc(this._t('open_integration'))}"><ha-icon icon="mdi:cog"></ha-icon></a>
      </div>
      <div class="tabs" role="tablist">${BM_PANEL_TABS.map((tab) => this._tabHtml(tab)).join('')}</div>
      <main>
        <section class="column" id="tab-batteries" role="tabpanel" aria-labelledby="tabbtn-batteries"><div id="card"></div></section>
        <section class="column" id="tab-settings" role="tabpanel" aria-labelledby="tabbtn-settings"></section>
        <section class="column" id="tab-actions" role="tabpanel" aria-labelledby="tabbtn-actions"></section>
      </main>`;
    this._menu = root.querySelector('ha-menu-button');
    this._menu.hass = this._hass;
    this._menu.narrow = this._narrow;
    root.querySelectorAll('.tab').forEach((button) => {
      button.addEventListener('click', () => this._goTab(button.dataset.tab));
      // Left and right arrows move between the tabs, as in a native tab bar
      button.addEventListener('keydown', (ev) => {
        var step = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        ev.preventDefault();
        var i = BM_PANEL_TABS.indexOf(this._tab);
        this._goTab(BM_PANEL_TABS[(i + step + BM_PANEL_TABS.length) % BM_PANEL_TABS.length], true);
      });
    });
    this._showTab(this._tab);
    if (this._card) root.getElementById('card').appendChild(this._card);
    this._renderSettings();
  }

  _tabHtml(tab) {
    var selected = tab === this._tab;
    return `<button class="tab${selected ? ' active' : ''}" role="tab" id="tabbtn-${tab}" data-tab="${tab}" aria-selected="${selected}" aria-controls="tab-${tab}" tabindex="${selected ? 0 : -1}">${bmPanelEsc(this._t(tab))}</button>`;
  }

  _mountCard() {
    if (!customElements.get('battery-monitor-card')) return;
    this._card = document.createElement('battery-monitor-card');
    // The full screen content laid out in the card; its CSV export is in the Actions tab. No `language`: the card
    // follows hass.language, so it switches language with the panel.
    this._card.setConfig({ expanded: true, csv_button: false });
    this._card.hass = this._hass;
    this.shadowRoot.getElementById('card')?.appendChild(this._card);
  }

  // The form: the fields the user typed over the stored values (so a change made elsewhere shows up)
  _draft() {
    return { ...(this._settings?.options || {}), ...this._drafts };
  }

  _edit(key, value) {
    this._drafts[key] = value;
    delete this._status.save;
  }

  _changed() {
    var stored = this._settings?.options || {};
    var d = this._draft();
    return (
      ['threshold', 'duration'].some((k) => String(d[k]) !== String(stored[k])) ||
      ['morning_time', 'evening_time'].some((k) => bmPanelClock(d[k]) !== bmPanelClock(stored[k])) ||
      BM_PANEL_LISTS.some((k) => !bmPanelSameList(d[k], stored[k]))
    );
  }

  _ok(key, value) {
    var [lo, hi] = BM_PANEL_LIMITS[key];
    var n = Number(value);
    return value !== '' && Number.isInteger(n) && n >= lo && n <= hi;
  }

  _valid() {
    var d = this._draft();
    return Object.keys(BM_PANEL_LIMITS).every((k) => this._ok(k, d[k])) && ['morning_time', 'evening_time'].every((k) => /^\d\d:\d\d/.test(d[k] || ''));
  }

  _number(key, label, hint, unit) {
    var esc = bmPanelEsc;
    var [lo, hi] = BM_PANEL_LIMITS[key];
    var value = this._draft()[key];
    return `
      <label class="ctl">
        <span>${esc(this._t(label))}</span>
        <div class="box${this._ok(key, value) ? '' : ' bad-value'}">
          <input type="number" inputmode="numeric" min="${lo}" max="${hi}" step="1" data-key="${key}" value="${esc(value)}">
          <em>${esc(this._t(unit))}</em>
        </div>
        <small>${esc(this._t(hint, { min: lo, max: hi }))}</small>
      </label>`;
  }

  _time(key, label) {
    var esc = bmPanelEsc;
    return `
      <label class="ctl">
        <span>${esc(this._t(label))}</span>
        <div class="box time">
          <input type="time" data-key="${key}" value="${esc(bmPanelClock(this._draft()[key]))}">
          <em><ha-icon icon="mdi:clock-outline"></ha-icon></em>
        </div>
        <small>${esc(this._t('f_times_hint'))}</small>
      </label>`;
  }

  // The choices of a list field: {value, label, detail}; a value chosen but no longer offered keeps its name
  _choices(key) {
    var s = this._settings;
    if (key === 'notify_services') return (s.notify_options || []).map((v) => ({ value: v, label: v.replace(/^notify\./, '') }));
    if (key === 'ignored_integrations') return (s.integration_options || []).map((o) => ({ value: o.value, label: o.label, detail: o.value }));
    var ignored = new Set(this._draft().ignored_integrations || []);
    return (s.entity_options || [])
      .filter((o) => !ignored.has(o.integration))
      .map((o) => ({ value: o.value, label: o.label, detail: [o.area, o.integration].filter(Boolean).join(' · ') }));
  }

  _chips(key, label, hint) {
    var esc = bmPanelEsc;
    var chosen = this._draft()[key] || [];
    var byValue = new Map(this._choices(key).map((c) => [c.value, c]));
    var chips = chosen
      .map((value) => {
        var c = byValue.get(value) || { value, label: value };
        return `
          <span class="chip" title="${esc(c.value)}">
            <span>${esc(c.label)}${c.detail ? ` <small>${esc(c.detail)}</small>` : ''}</span>
            <button type="button" data-remove="${esc(value)}" data-list="${key}" title="${esc(this._t('remove_chip', { name: c.label }))}"><ha-icon icon="mdi:close"></ha-icon></button>
          </span>`;
      })
      .join('');
    var left = [...byValue.values()].filter((c) => !chosen.includes(c.value));
    var options = left
      .map((c) => `<option value="${esc(c.value)}">${esc(c.label)}${c.detail ? ` — ${esc(c.detail)}` : ''}</option>`)
      .join('');
    return `
      <div class="ctl wide">
        <span>${esc(this._t(label))}</span>
        ${chips ? `<div class="chips">${chips}</div>` : ''}
        <div class="box">
          <select data-key="${key}" aria-label="${esc(this._t(label))}"${left.length ? '' : ' disabled'}>
            <option value="">${esc(this._t(left.length ? 'pick' : 'no_choice'))}</option>${options}
          </select>
        </div>
        <small>${esc(this._t(hint))}</small>
      </div>`;
  }

  _settingsHtml() {
    var esc = bmPanelEsc;
    var busy = this._busy;
    var status = this._status.save;
    var canSave = !busy && this._changed() && this._valid();
    return `
      <ha-card class="block" id="form">
        <div class="grid">
          ${this._number('threshold', 'f_threshold', 'f_threshold_hint', 'u_percent')}
          ${this._number('duration', 'f_duration', 'f_duration_hint', 'u_hours')}
          ${this._time('morning_time', 'f_morning')}
          ${this._time('evening_time', 'f_evening')}
          ${this._chips('notify_services', 'f_notify', 'f_notify_hint')}
          ${this._chips('ignored_integrations', 'f_ignored_integrations', 'f_ignored_integrations_hint')}
          ${this._chips('ignored_entities', 'f_ignored_entities', 'f_ignored_entities_hint')}
        </div>
        <div class="bar">
          <div class="links">${status ? `<span class="msg ${status.tone || ''}">${esc(status.text)}</span>` : ''}</div>
          <button class="act" data-do="save"${canSave ? '' : ' disabled'}><ha-icon icon="mdi:content-save"></ha-icon>${esc(this._t(busy === 'save' ? 'saving' : 'save'))}</button>
        </div>
      </ha-card>`;
  }

  _when(iso) {
    if (!iso) return this._t('never');
    try {
      return new Date(iso).toLocaleString(this._hass?.locale?.language || this._lang(), { dateStyle: 'medium', timeStyle: 'short' });
    } catch (_err) {
      return iso;
    }
  }

  _actionsHtml() {
    var esc = bmPanelEsc;
    var entry = this._settings.entry;
    var busy = this._busy;
    var state = this._t(`st_${entry.state}`) === `st_${entry.state}` ? this._t('st_other') : this._t(`st_${entry.state}`);
    var running = entry.state === 'loaded';
    var status = this._status.action;
    var last = entry.last_notification
      ? `${this._when(entry.last_notification)} · ${this._t('notified_count', { count: entry.last_notified ?? 0 })}`
      : this._t('never');
    return `
      <ha-card class="block" id="actions">
        <div class="head">
          <div class="avatar"><ha-icon icon="mdi:battery-heart-variant"></ha-icon></div>
          <div class="who">
            <div class="n">${esc(this._t('title'))}</div>
            <div class="s">${esc(this._t('last_notification'))} · ${esc(last)}</div>
          </div>
          <span class="pill ${bmPanelTone(entry.state)}">${esc(state)}</span>
        </div>
        <div class="row">
          <label class="ctl">
            <span>${esc(this._t('f_path'))}</span>
            <div class="box"><input type="text" data-key="export_path" value="${esc(this._exportPath)}" placeholder="battery_monitor.csv"></div>
            <small>${esc(this._t('f_path_hint'))}</small>
          </label>
          <button class="act quiet" data-do="export"${busy || !running ? ' disabled' : ''}><ha-icon icon="mdi:file-delimited-outline"></ha-icon>${esc(this._t(busy === 'export' ? 'exporting' : 'export'))}</button>
        </div>
        <div class="bar">
          <div class="links">
            ${entry.device_id ? `<a href="/config/devices/device/${esc(entry.device_id)}"><ha-icon icon="mdi:devices"></ha-icon>${esc(this._t('open_device'))}</a>` : ''}
            ${status ? `<span class="msg ${status.tone || ''}">${esc(status.text)}</span>` : ''}
          </div>
          <button class="act" data-do="notify"${busy || !running ? ' disabled' : ''}><ha-icon icon="mdi:bell-ring-outline"></ha-icon>${esc(this._t(busy === 'notify' ? 'notifying' : 'notify'))}</button>
        </div>
      </ha-card>`;
  }

  // The Settings and Actions tabs, both from the settings command (the Batteries tab holds the card)
  _renderSettings() {
    var root = this.shadowRoot;
    var settings = root.getElementById('tab-settings');
    var actions = root.getElementById('tab-actions');
    if (!settings || !actions) return;
    var esc = bmPanelEsc;
    var note = null;
    if (this._settings === null) note = `<ha-card class="note">${esc(this._t('loading'))}</ha-card>`;
    else if (!this._settings.entry) {
      note = `<ha-card class="note">${esc(this._t('none'))}
        <a class="act" href="/config/integrations/dashboard/add?domain=battery_monitor"><ha-icon icon="mdi:plus"></ha-icon>${esc(this._t('open_add'))}</a></ha-card>`;
    }
    if (note) {
      settings.innerHTML = note;
      actions.innerHTML = note;
      return;
    }
    var focus = this._focusOf(root.querySelector('main'));
    settings.innerHTML = this._settingsHtml();
    actions.innerHTML = this._actionsHtml();
    this._bind(settings);
    this._bind(actions);
    this._refocus(root.querySelector('main'), focus);
  }

  // The focused field or button (attribute, caret), so a re-render can give the focus back.
  // A button disabled meanwhile (Notify now while it runs) gets it back on the next render that enables it again.
  _focusOf(box) {
    var el = this.shadowRoot.activeElement;
    if (!el || !box.contains(el)) {
      var pending = this._pendingFocus;
      return pending && !el ? pending : null;
    }
    var attr = ['key', 'do', 'remove'].find((a) => el.dataset?.[a] != null);
    if (!attr) return null;
    var focus = { attr: `data-${attr}`, value: el.dataset[attr], range: null };
    try {
      // Number and time inputs have no selection (null, or an exception in some browsers)
      if (el.selectionStart != null) focus.range = [el.selectionStart, el.selectionEnd, el.selectionDirection];
    } catch (_err) {
      focus.range = null;
    }
    return focus;
  }

  _refocus(box, focus) {
    this._pendingFocus = null;
    if (!focus) return;
    var el = box.querySelector(`[${focus.attr}="${CSS.escape(focus.value)}"]`);
    if (!el) return;
    if (el.disabled) {
      // Only while an action runs: a Save left disabled after saving must not grab the focus later
      if (this._busy) this._pendingFocus = focus;
      return;
    }
    el.focus({ preventScroll: true });
    if (!focus.range) return;
    try {
      el.setSelectionRange(...focus.range);
    } catch (_err) {
      // the caret cannot be set on this field type
    }
  }

  // Refresh only the Save button and the field borders, so typing keeps the focus
  _refreshBar(box) {
    var save = box.querySelector('[data-do="save"]');
    if (save) save.disabled = !!this._busy || !this._changed() || !this._valid();
    box.querySelectorAll('input[type="number"]').forEach((input) => {
      input.parentElement.classList.toggle('bad-value', !this._ok(input.dataset.key, input.value));
    });
    var msg = box.querySelector('#form .links');
    if (msg && !this._status.save) msg.innerHTML = '';
  }

  _bind(box) {
    box.querySelectorAll('input[data-key]').forEach((input) => {
      input.addEventListener('input', () => {
        if (input.dataset.key === 'export_path') this._exportPath = input.value;
        else this._edit(input.dataset.key, input.value);
        this._refreshBar(box);
      });
      input.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter') return;
        if (input.dataset.key === 'export_path') this._export();
        else if (!box.querySelector('[data-do="save"]').disabled) this._save();
      });
    });
    box.querySelectorAll('select[data-key]').forEach((select) => {
      select.addEventListener('change', () => {
        if (!select.value) return;
        var key = select.dataset.key;
        this._edit(key, [...(this._draft()[key] || []), select.value]);
        this._renderSettings();
      });
    });
    box.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        var key = button.dataset.list;
        this._edit(key, (this._draft()[key] || []).filter((v) => v !== button.dataset.remove));
        this._renderSettings();
        box.querySelector(`select[data-key="${key}"]`)?.focus({ preventScroll: true });
      });
    });
    box.querySelector('[data-do="save"]')?.addEventListener('click', () => this._save());
    box.querySelector('[data-do="notify"]')?.addEventListener('click', () => this._notify());
    box.querySelector('[data-do="export"]')?.addEventListener('click', () => this._export());
  }

  async _run(kind, slot, call) {
    this._busy = kind;
    this._renderSettings();
    try {
      this._status[slot] = await call();
    } catch (err) {
      this._status[slot] = { tone: 'bad', text: err?.message || this._t('err_generic') };
    }
    this._busy = null;
    this._renderSettings();
  }

  _error(res) {
    var key = `err_${res?.error || 'generic'}`;
    var text = this._t(key) === key ? res?.message || this._t('err_generic') : this._t(key);
    return { tone: 'bad', text };
  }

  _save() {
    var d = this._draft();
    return this._run('save', 'save', async () => {
      var res = await this._hass.callWS({
        type: 'battery_monitor/update_settings',
        threshold: Number(d.threshold),
        duration: Number(d.duration),
        morning_time: bmPanelClock(d.morning_time),
        evening_time: bmPanelClock(d.evening_time),
        notify_services: d.notify_services || [],
        ignored_integrations: d.ignored_integrations || [],
        ignored_entities: d.ignored_entities || [],
      });
      if (!res?.ok) return this._error(res);
      this._drafts = {};
      this._settings.options = res.options;
      return { tone: 'good', text: this._t('saved') };
    });
  }

  _notify() {
    return this._run('notify', 'action', async () => {
      var res = await this._hass.callWS({ type: 'battery_monitor/notify' });
      if (!res?.ok) return this._error(res);
      await this._load();
      return { tone: 'good', text: this._t(res.notified ? 'notified' : 'notified_none', { count: res.notified }) };
    });
  }

  _export() {
    var path = this._exportPath.trim();
    return this._run('export', 'action', async () => {
      var res = await this._hass.callWS({ type: 'battery_monitor/export', ...(path ? { path } : {}) });
      if (!res?.ok) return this._error(res);
      return { tone: 'good', text: this._t('exported', { path: res.path, count: res.batteries }) };
    });
  }
}

if (!customElements.get('battery-monitor-panel')) {
  customElements.define('battery-monitor-panel', BatteryMonitorPanel);
}
