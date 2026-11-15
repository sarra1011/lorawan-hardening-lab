# Tutoriel : utiliser le LoRaWAN Hardening Lab

Ce tutoriel te guide pas à pas dans le simulateur. Durée : environ 15 minutes. Le but est de montrer, avec des preuves, comment durcir un back-end LoRaWAN (serveurs network, join et application) pour l'exigence **OWASP ISVS 4.6.2**.

## 1. Ouvrir le simulateur

- En ligne : `https://<your-username>.github.io/lorawan-hardening-lab/`
- En local : dans le dossier du projet, lance `python3 -m http.server 8080`, puis ouvre http://localhost:8080

Rien à installer, aucune donnée n'est envoyée sur le réseau.

## 2. Découvrir l'interface

| Zone | Rôle |
|---|---|
| Bandeau de score | Note sur 100, verdict (Exposed, Weak, Good, Hardened), nombre de contrôles actifs, attaques stoppées, contrôles critiques encore désactivés |
| Stack map | Schéma de l'architecture. Chaque serveur est coloré selon son contrôle le plus faible : vert (tout actif), orange (certains inactifs), rouge (un contrôle critique inactif). Clique sur un serveur pour surligner ses interrupteurs |
| Hardening controls | 22 interrupteurs, groupés par serveur. Chacun affiche son identifiant (MQ-01, NS-03...), sa gravité et la ligne de configuration concernée |
| Attack console | 12 attaques. Le badge BLOCKED, PARTIAL ou BREACH se met à jour à chaque interrupteur. Le bouton Run rejoue l'attaque pas à pas dans le terminal |
| What a sniffer sees | Ce qu'un attaquant voit sur le réseau : JSON lisible en clair, ou enregistrements TLS chiffrés. Le point rouge ou bleu sur la Stack map est un uplink en train de circuler |
| Generated configuration | Les fichiers `chirpstack.toml`, `region_eu868.toml`, `mosquitto.conf` et `gateway-bridge.toml`, réécrits à chaque changement. Les lignes rouges sont les réglages qui laissent passer l'attaque |
| Report | Rapport en markdown, avec le bouton Copy report |

## 3. Scénario 1 : installation par défaut (état « avant »)

1. Clique sur **Default install**. Score : **0/100**, verdict Exposed.
2. Clique sur **Run all 12 attacks**. Attends environ 15 secondes.
3. Lis le terminal. Les 12 attaques aboutissent : sniffing MQTT, abonnement anonyme à `#`, connexion `admin/admin`, faux token JWT, fausse gateway, etc.
4. Regarde la zone **What a sniffer sees** : les messages apparaissent en clair, avec le `devEui` et la température.
5. Ouvre l'onglet `mosquitto.conf` de la configuration générée : les lignes rouges montrent `allow_anonymous true`, le listener 1883 en clair, aucune ACL.

**Capture à prendre :** la page entière avec le score 0/100, le terminal rempli de BREACH et la configuration en rouge. C'est ta preuve « avant ».

## 4. Scénario 2 : TLS seul ne suffit pas

1. Clique sur **TLS only**. Score : **28/100**.
2. Clique sur **Run all 12 attacks**.
3. Résultat : 3 attaques stoppées (A1 sniffing, A4 identifiants web, A7 downgrade TLS) et 9 réussissent encore.

À retenir : chiffrer les flux protège la confidentialité, mais ne corrige ni les identifiants par défaut, ni le secret JWT, ni les gateways non authentifiées, ni la protection des clés racines.

## 5. Scénario 3 : durcir étape par étape (le cœur de la démo)

Pars de **Default install**, puis active les contrôles dans cet ordre en observant le score. Ordre recommandé : les contrôles critiques d'abord.

| Étape | Interrupteurs à activer | Score | Attaques stoppées |
|---|---|---|---|
| 1. Broker : plus d'accès anonyme | MQ-01, MQ-02 | 14 | 1/12 |
| 2. Secrets et comptes | NS-01, AS-01, AS-03 | 36 | 3/12 |
| 3. TLS côté application | AS-04, AS-02 | 45 | 5/12 |
| 4. Broker : TLS 1.2, mTLS, ACL | MQ-03, MQ-04, MQ-05 | 58 | 6/12 |
| 5. Gateways authentifiées | GW-01, GW-02, NS-03 | 70 | 7/12 |
| 6. Join server | JS-01, JS-02, JS-03 | 81 | 10/12 |
| 7. Base de données et journaux | AS-06, AS-05, NS-05, NS-07 | 94 | 12/12 |
| 8. Défense en profondeur | NS-02, NS-04 | 100 | 12/12 |

Après chaque étape, clique sur **Clear log** puis **Run all 12 attacks** pour voir quelles attaques passent encore.

**Astuce :** utilise le bouton **Apply the fix and re-run**. Clique sur **Run** d'une seule attaque (par exemple A3) : après un BREACH, ce bouton apparaît dans le terminal. Il active les contrôles qui bloquent cette attaque et la rejoue immédiatement, pour montrer le passage de BREACH à BLOCKED. Il n'apparaît pas pendant un Run all.

**Capture à prendre :** la page avec **Fully hardened** (score 100/100, `12 of 12 attacks stopped`) et la configuration sans aucune ligne rouge. C'est ta preuve « après ».

## 6. Scénario 4 : casser un contrôle pour voir son effet

Clique sur **Fully hardened**, puis désactive un seul interrupteur :

| Interrupteur désactivé | Attaque qui revient | Résultat |
|---|---|---|
| AS-03 (admin/admin) | A3 | BREACH : accès administrateur complet |
| JS-02 (DevNonce) | A8 | BREACH : rejeu d'un JoinRequest |
| AS-01 (secret API) | A5 | BREACH : faux token JWT accepté |
| GW-02 (UDP 1700) | A6 | PARTIAL : usurpation d'une gateway enregistrée |
| AS-05 (sslmode) | A10 | PARTIAL : base privée mais lien interne non chiffré |
| MQ-02 puis MQ-04 | A2 | PARTIAL : connexion anonyme acceptée, mais l'ACL refuse les topics |

Cela montre que chaque contrôle a un effet mesurable. Remets l'interrupteur en place ensuite.

## 7. Lire la configuration générée

1. Passe d'un onglet à l'autre : `chirpstack.toml`, `region_eu868.toml`, `mosquitto.conf`, `gateway-bridge.toml`.
2. Une ligne rouge se termine par `# INSECURE`. Elle disparaît quand tu actives le contrôle correspondant.
3. Utilise ces fichiers comme modèle pour ton vrai déploiement. Les valeurs sont celles du dossier `hardened/` de ton projet ISVS 4.6.2.

## 8. Produire le rapport

1. Mets le simulateur dans l'état voulu (par exemple **Fully hardened**).
2. Descends en bas de la page, clique sur **Copy report**.
3. Colle le texte dans ton rapport : il contient le score, le tableau des 22 contrôles et le tableau des 12 attaques avec leur impact.
4. Si le bouton ne copie pas, sélectionne le texte du cadre et copie-le avec `Ctrl+C`.

## 9. Script de démonstration (3 minutes)

1. **Default install**, **Run all** : « sans durcissement, les 12 attaques réussissent, score 0 ».
2. Montre la zone *What a sniffer sees* en clair et le `mosquitto.conf` en rouge.
3. **TLS only**, **Run all** : « le chiffrement seul bloque 3 attaques sur 12 ».
4. Clique sur **Run** d'A3, puis **Apply the fix and re-run** : « une correction, une attaque bloquée ».
5. **Fully hardened**, **Run all** : « 12 sur 12, score 100 ».
6. Désactive JS-02 : « le rejeu de JoinRequest revient immédiatement ».
7. Conclus : « le simulateur est un modèle pédagogique, la preuve réelle vient de l'audit `lorawan_audit.py` et de la pile Docker ».

## 10. Questions fréquentes

**Les attaques sont-elles réelles ?** Non. Les résultats sont calculés à partir des réglages de configuration de ChirpStack, Gateway Bridge et Mosquitto. Aucun trafic réseau n'est généré.

**Pourquoi NS-02, NS-04 et MQ-04 ne changent-ils aucune attaque seuls ?** Ce sont des mesures de défense en profondeur : une autre protection bloque déjà l'attaque. Ils comptent quand même dans le score.

**Le bouton Run est grisé.** Une attaque est en cours. Attends la fin ou clique sur **Clear log**.

**Le terminal est trop long.** Clique sur **Clear log** avant chaque nouvelle série d'attaques.

**La page est vide ou cassée en local.** Lance le serveur avec `python3 -m http.server 8080` au lieu d'ouvrir le fichier directement, puis recharge avec `Ctrl+Shift+R`.

**Au clavier ?** Tab pour passer d'un élément à l'autre, Espace ou Entrée pour activer un interrupteur ou un serveur sur la carte.

## 11. Pour aller plus loin

- Lance l'audit réel : `bash run_selftest.sh` dans le dossier `isvs_4_6_2/` produit les scores avant et après sur les fichiers de configuration, avec les preuves.
- Déploie la pile durcie avec `hardened/docker-compose.yml` si Docker est disponible, puis relance l'audit en mode `live`.
