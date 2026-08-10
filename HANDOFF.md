# SODA — note de passation

Écrite le 2026-08-07, à la fin de la session qui a mené le jeu de « onze zones
en développement » à « prêt à déposer sur Google Play ». Tout ce qui suit est
ce qu'on ne peut pas déduire du code ni de l'historique git.

---

## Où en est le jeu

**Douze zones**, chacune avec sa propre mécanique, jamais un repeint :

| Zone | Mécanique |
|---|---|
| THE RING | apprentissage des trois verbes |
| THE SHORE | houle mobile qui rattrape par derrière |
| THE SUGAR FLATS | relief réel, la gravité donne et reprend |
| THE MARKET | grind sur rails |
| THE GREENHOUSE | haies infranchissables sauf par pad |
| THE DOCKS | gravité basse, la passerelle s'arrête |
| THE ARCADE | bumpers à enchaîner |
| THE HEIGHTS | dalles manquantes |
| THE VAULT | vol, grille 3×3 (altitude basse = la route) |
| THE BOTTLING PLANT | marteaux de capsulage cadencés — **timing**, pas placement |
| THE STORM | pont supérieur + débris aériens |
| THE CORE | medley : chaque chunk bâti depuis une zone donneuse, repeint néon |

## Play Store — état exact

**Fait :**
- Compte développeur validé, application créée sous le paquet **`com.soda.game`**
  (définitif une fois publié — il a été renommé depuis `cloud.pandaerp.soda`).
- Clé de signature créée : `soda-upload.jks` à la racine, mot de passe dans
  `android/keystore.properties`. **Les deux sont gitignorés.**
- AAB signé qui sort de `./gradlew bundleRelease`, ~43 Mo, signature vérifiée.
- Tous les visuels dans `store/` : fiche EN et FR, feature graphic 1024×500,
  6 captures téléphone 1080×1920, 4 tablette 7", 4 tablette 10", et le pack
  Google Play Games sur PC (logo transparent, image de présentation, 6 captures
  16:9).
- Icône et splash Android générés par `tools/make-icons.mjs`.
- Politique de confidentialité en ligne : `leiaperch.github.io/soda/privacy.html`

**Reste :**
- **12 testeurs pendant 14 jours** en test fermé. Meilleure piste : le Discord RP.
  Recruter 15 et non 12, un désistement remet le compteur à zéro.
- Formulaires Data safety (brouillon dans `store/play-listing.md`) et
  classification du contenu.
- Valider « jouable hors ligne » en mode avion sur le build de release.
- **Sauvegarder le `.jks` hors de ce PC.** Perdu = plus jamais de mise à jour.

## Construire

```powershell
# JAVA_HOME systeme est en Java 8, Gradle exige 11+
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
npm run build ; npx cap sync android
cd android ; .\gradlew.bat bundleRelease     # AAB signe, pour Play
cd android ; .\gradlew.bat assembleDebug     # APK, pour le telephone
```

Dev : `npm run dev` (port 5184, entrée `soda` dans `~/.claude/launch.json`).
Déploiement Pages : `gh workflow run pages.yml` (manuel, volontaire).

---

## Ce qui reste ouvert dans le code

1. **Le Bottling Plant n'a jamais été joué à la main.** Sa mécanique est neuve
   (marteaux), et vient d'être ralentie de 46 à 32 m/s et raccourcie à 2300 m
   après un retour « beaucoup trop dur ». À rejuger en jouant.
2. **Six formes d'obstacles dépassent leur boîte de collision** de 5 à 22 cm
   (`rock`, `hoard`, `log`…). Sans effet sur les blocs, cosmétique sur les
   barrières qu'on saute. Audit reproductible : voir la note en tête de
   `src/world/obstacles.js`.
3. **La descente perpétuelle du Core** (`drop: 0.22`) a une histoire de trois
   versions ratées documentée dans `zones.js`. Elle est active et validée
   visuellement, mais c'est le réglage le plus fragile du projet.
4. **`store/` contient de vieux fichiers du 1er août** (`LISTING.md`,
   `store-shot-*.png`, `store-feature-1024x500.png`) qui ne correspondent plus
   au jeu. À supprimer.
5. **Un fragment de tableau dupliqué** traîne dans `store/play-listing.md`
   vers la section Screenshots, séquelle d'un remplacement raté.
6. Jamais faits : ghost replay, Daily Run, traduction du jeu (seule la fiche
   est traduite).

---

## Pièges à ne pas redécouvrir

**`new THREE.Color('hsl(210 90% 55%)')` rend BLANC.** three.js n'accepte que la
forme à virgules. La syntaxe CSS moderne échoue en silence. Ça a coûté trois
tours de réglages de palette : je montais la saturation, changeais l'éclairage,
et rien n'arrivait jamais au moteur. Test décisif : `.getHexString()`.

**Vérifier au format de l'écran de la joueuse.** Elle joue en 16:9 large ; mes
captures étaient en portrait téléphone. Tout ce qui clochait — les billboards
et portiques peints en noir codé en dur — était sur les bords, hors de mon
cadre. Mes mesures étaient exactes et mes conclusions fausses.

**Quand un réglage n'a AUCUN effet, il n'arrive pas.** Ce n'est presque jamais
un mauvais dosage. Tester la valeur isolément avant de tourner le bouton une
deuxième fois.

**`Builder.at()` ne tourne qu'autour de Y.** Un `cyl()` à l'intérieur se dresse
à la verticale. Ce défaut a été livré cinq fois. Pour un plan incliné, utiliser
`quad()`/`tri()` avec des points explicites.

**Un pool trop petit fabrique des obstacles invisibles.** Le pool de marteaux
était à 8 pour 9 presses à portée : la neuvième tuait sans être dessinée.
Trier par proximité, et surdimensionner.

**Décider dans une seule boucle.** Deux fois le même bug : le pont de la
tempête et la tranchée du Core avaient chacun deux tronçons en portée, et
celui où la joueuse n'était *pas* annulait celui où elle était. La sortie doit
être décidée une fois contre tous les éléments, jamais élément par élément.

**Ne jamais mettre du pastel sur un canal émissif.** Ce qui crame, c'est la
clarté, pas la saturation. Saturation au plafond, clarté tenue en laisse.

---

## Méthode

**Tous les vrais défauts de cette session ont été trouvés par Leïa en jouant.
Aucun par mes vérifications automatiques.** Les mesures servent à confirmer une
correction, pas à trouver un problème. Avant de conclure quoi que ce soit sur
une zone, la jouer.
