import streamlit as st
import math

st.set_page_config(page_title="Portugal vs Colombia - Mundial 2026", layout="wide")

# --- DATOS REALES DEL TORNEO ---

GROUP_K_MATCHES = [
    {"date": "17 Jun", "home": "Portugal", "away": "R.D. Congo", "score": "1-1",
     "home_goals": ["Joao Neves 6'"], "away_goals": ["Wissa 45+5'"]},
    {"date": "17 Jun", "home": "Uzbekistan", "away": "Colombia", "score": "1-3",
     "home_goals": ["Fayzullaev 60'"], "away_goals": ["Munoz 40'", "L. Diaz 65'", "Campaz 90+9'"]},
    {"date": "23 Jun", "home": "Portugal", "away": "Uzbekistan", "score": "5-0",
     "home_goals": ["Ronaldo 6'", "Nuno Mendes 17'", "Ronaldo 39'", "Nematov OG 60'", "Leao 87'"],
     "away_goals": []},
    {"date": "23 Jun", "home": "Colombia", "away": "R.D. Congo", "score": "1-0",
     "home_goals": ["Munoz 76'"], "away_goals": []},
    {"date": "27 Jun", "home": "Colombia", "away": "Portugal", "score": "0-0",
     "home_goals": [], "away_goals": []},
    {"date": "27 Jun", "home": "R.D. Congo", "away": "Uzbekistan", "score": "0-1",
     "home_goals": [], "away_goals": ["Shomurodov 10'"]},
]

STANDINGS = [
    {"team": "Colombia",    "pj": 3, "g": 2, "e": 1, "p": 0, "gf": 4, "gc": 1, "dg": 3,  "pts": 7},
    {"team": "Portugal",    "pj": 3, "g": 1, "e": 2, "p": 0, "gf": 6, "gc": 1, "dg": 5,  "pts": 5},
    {"team": "Uzbekistan",  "pj": 3, "g": 1, "e": 0, "p": 2, "gf": 2, "gc": 8, "dg": -6, "pts": 3},
    {"team": "R.D. Congo",  "pj": 3, "g": 0, "e": 1, "p": 2, "gf": 1, "gc": 3, "dg": -2, "pts": 1},
]

PORTUGAL_STATS = {
    "fifa_rank": 8, "fifa_pts": 1766.74,
    "elo": 1970,
    "group_gf": 6, "group_ga": 1, "group_matches": 2,
    "xg_total": 3.4, "xga_total": 1.4,
    "possession_avg": 62, "shots_total": 24, "sot_total": 10,
    "ppda": 6.8,
    "recent_10": {"w": 6, "d": 3, "l": 1, "gf": 23, "ga": 7},
    "key_players": [
        {"name": "Cristiano Ronaldo", "age": 41, "club": "Al Nassr", "goals": 2, "assists": 0,
         "note": "1er jugador en marcar en 6 Mundiales distintos"},
        {"name": "Bruno Fernandes", "age": 31, "club": "Man United", "goals": 0, "assists": 2,
         "note": "7 pases de linea rompedora (2do en torneo)"},
        {"name": "Joao Neves", "age": 21, "club": "PSG", "goals": 1, "assists": 0, "note": ""},
        {"name": "Rafael Leao", "age": 27, "club": "AC Milan", "goals": 1, "assists": 0, "note": ""},
        {"name": "Nuno Mendes", "age": 24, "club": "PSG", "goals": 1, "assists": 0, "note": "Gol de tiro libre"},
    ]
}

COLOMBIA_STATS = {
    "fifa_rank": 11, "fifa_pts": 1727.42,
    "elo": 1920,
    "group_gf": 4, "group_ga": 1, "group_matches": 2,
    "xg_total": 2.55, "xga_total": 1.54,
    "possession_avg": 58, "shots_total": 35, "sot_total": 13,
    "ppda": 9.2,
    "recent_10": {"w": 6, "d": 2, "l": 2, "gf": 21, "ga": 11},
    "key_players": [
        {"name": "Daniel Munoz", "age": 30, "club": "Crystal Palace", "goals": 2, "assists": 0,
         "note": "Goleador del equipo en el torneo"},
        {"name": "Luis Diaz", "age": 29, "club": "Bayern Munich", "goals": 1, "assists": 1,
         "note": "Gol + asistencia + palo en un mismo partido"},
        {"name": "James Rodriguez", "age": 34, "club": "Minnesota Utd", "goals": 0, "assists": 0,
         "note": "Capitan, 3er Mundial. Bota de Oro 2014"},
        {"name": "Jaminton Campaz", "age": 25, "club": "Rosario Central", "goals": 1, "assists": 0, "note": ""},
        {"name": "Jhon Cordoba", "age": 33, "club": "Krasnodar", "goals": 0, "assists": 0, "note": ""},
    ]
}


def poisson_prob(lam, k):
    return (lam ** k * math.exp(-lam)) / math.factorial(k)


# ============================
# TITULO Y CONTEXTO
# ============================
st.title("Portugal vs Colombia | Mundial 2026")
st.markdown("**Grupo K - Fecha 3** | Hard Rock Stadium, Miami | 27 junio 2026")
st.markdown("---")

# ============================
# TABLA DE POSICIONES
# ============================
st.header("Tabla de Posiciones - Grupo K")

header_cols = st.columns([3, 1, 1, 1, 1, 1, 1, 1, 1])
headers = ["Equipo", "PJ", "G", "E", "P", "GF", "GC", "DG", "Pts"]
for col, h in zip(header_cols, headers):
    col.markdown(f"**{h}**")

for i, team in enumerate(STANDINGS):
    cols = st.columns([3, 1, 1, 1, 1, 1, 1, 1, 1])
    emoji = "" if i >= 2 else ""
    cols[0].write(f"{'**' if i < 2 else ''}{team['team']}{'**' if i < 2 else ''}")
    for j, key in enumerate(["pj", "g", "e", "p", "gf", "gc", "dg", "pts"]):
        val = team[key]
        cols[j+1].write(f"{'**' if i < 2 else ''}{val}{'**' if i < 2 else ''}")

st.markdown("---")

# ============================
# RESULTADOS DEL GRUPO
# ============================
st.header("Resultados del Grupo K")
for match in GROUP_K_MATCHES:
    with st.container():
        c1, c2, c3 = st.columns([3, 1, 3])
        c1.markdown(f"**{match['home']}**")
        c2.markdown(f"**{match['score']}**")
        c3.markdown(f"**{match['away']}**")
        goals = []
        if match["home_goals"]:
            goals.append(f"{match['home']}: {', '.join(match['home_goals'])}")
        if match["away_goals"]:
            goals.append(f"{match['away']}: {', '.join(match['away_goals'])}")
        if goals:
            st.caption(f"{match['date']} | {' | '.join(goals)}")
        else:
            st.caption(f"{match['date']}")

st.markdown("---")

# ============================
# COMPARACION DE EQUIPOS
# ============================
st.header("Comparativa Pre-Partido (antes de Fecha 3)")

col1, col2 = st.columns(2)

with col1:
    st.subheader("Portugal")
    st.metric("Ranking FIFA", f"#{PORTUGAL_STATS['fifa_rank']}", f"{PORTUGAL_STATS['fifa_pts']:.0f} pts")
    st.metric("Rating Elo", PORTUGAL_STATS['elo'])
    st.metric("Goles en grupo", f"{PORTUGAL_STATS['group_gf']} GF / {PORTUGAL_STATS['group_ga']} GC")
    st.metric("xG total (2 partidos)", f"{PORTUGAL_STATS['xg_total']:.2f}")
    st.metric("xGA total (2 partidos)", f"{PORTUGAL_STATS['xga_total']:.2f}")
    st.metric("Posesion promedio", f"{PORTUGAL_STATS['possession_avg']}%")
    st.metric("Tiros / A puerta", f"{PORTUGAL_STATS['shots_total']} / {PORTUGAL_STATS['sot_total']}")
    st.metric("PPDA (presion)", f"{PORTUGAL_STATS['ppda']}", "Mas agresivo del torneo")
    r = PORTUGAL_STATS['recent_10']
    st.metric("Ultimos 10 partidos", f"{r['w']}W {r['d']}D {r['l']}L", f"{r['gf']}GF / {r['ga']}GC")

with col2:
    st.subheader("Colombia")
    st.metric("Ranking FIFA", f"#{COLOMBIA_STATS['fifa_rank']}", f"{COLOMBIA_STATS['fifa_pts']:.0f} pts")
    st.metric("Rating Elo", COLOMBIA_STATS['elo'])
    st.metric("Goles en grupo", f"{COLOMBIA_STATS['group_gf']} GF / {COLOMBIA_STATS['group_ga']} GC")
    st.metric("xG total (2 partidos)", f"{COLOMBIA_STATS['xg_total']:.2f}")
    st.metric("xGA total (2 partidos)", f"{COLOMBIA_STATS['xga_total']:.2f}")
    st.metric("Posesion promedio", f"{COLOMBIA_STATS['possession_avg']}%")
    st.metric("Tiros / A puerta", f"{COLOMBIA_STATS['shots_total']} / {COLOMBIA_STATS['sot_total']}")
    st.metric("PPDA (presion)", f"{COLOMBIA_STATS['ppda']}")
    r = COLOMBIA_STATS['recent_10']
    st.metric("Ultimos 10 partidos", f"{r['w']}W {r['d']}D {r['l']}L", f"{r['gf']}GF / {r['ga']}GC")

st.markdown("---")

# ============================
# JUGADORES CLAVE
# ============================
st.header("Jugadores Clave en el Torneo")

col1, col2 = st.columns(2)
with col1:
    st.subheader("Portugal")
    for p in PORTUGAL_STATS["key_players"]:
        line = f"**{p['name']}** ({p['age']}, {p['club']}) - {p['goals']}G {p['assists']}A"
        if p["note"]:
            line += f" | _{p['note']}_"
        st.markdown(line)

with col2:
    st.subheader("Colombia")
    for p in COLOMBIA_STATS["key_players"]:
        line = f"**{p['name']}** ({p['age']}, {p['club']}) - {p['goals']}G {p['assists']}A"
        if p["note"]:
            line += f" | _{p['note']}_"
        st.markdown(line)

st.markdown("---")

# ============================
# MODELO POISSON
# ============================
st.header("Modelo Estadistico: Poisson Bivariado")

st.markdown("""
El **modelo de Poisson** es uno de los metodos mas utilizados en analitica
deportiva para predecir resultados de futbol. Modela la cantidad de goles
de cada equipo como variables independientes de Poisson, calibradas con:

1. **Fuerza de ataque** (goles marcados vs promedio del torneo)
2. **Fuerza defensiva** (goles recibidos vs promedio del torneo)
3. **Ajuste Elo** (calidad relativa historica)
4. **Factor tactico** (contexto competitivo del partido)
""")

# --- Parametros ajustables ---
st.subheader("Parametros del Modelo")

col1, col2, col3 = st.columns(3)
with col1:
    tournament_avg = st.slider("Promedio goles/partido torneo", 2.0, 3.5, 2.6, 0.1)
with col2:
    elo_weight = st.slider("Peso del ajuste Elo", 0.0, 0.5, 0.25, 0.05)
with col3:
    tactical_col = st.slider("Factor tactico Colombia (conservador)", 0.7, 1.0, 0.88, 0.02)
    tactical_por = st.slider("Factor tactico Portugal (agresivo)", 1.0, 1.3, 1.05, 0.05)

avg_goals_per_team = tournament_avg / 2

por_attack = (PORTUGAL_STATS["group_gf"] / PORTUGAL_STATS["group_matches"]) / avg_goals_per_team
col_attack = (COLOMBIA_STATS["group_gf"] / COLOMBIA_STATS["group_matches"]) / avg_goals_per_team
por_defense = (PORTUGAL_STATS["group_ga"] / PORTUGAL_STATS["group_matches"]) / avg_goals_per_team
col_defense = (COLOMBIA_STATS["group_ga"] / COLOMBIA_STATS["group_matches"]) / avg_goals_per_team

elo_diff = PORTUGAL_STATS["elo"] - COLOMBIA_STATS["elo"]
elo_factor = 10 ** (elo_diff / 400)

lambda_por = avg_goals_per_team * por_attack * col_defense * (elo_factor ** elo_weight) * tactical_por
lambda_col = avg_goals_per_team * col_attack * por_defense / (elo_factor ** elo_weight) * tactical_col

st.markdown("### Fuerzas Relativas")
mc1, mc2, mc3, mc4 = st.columns(4)
mc1.metric("Ataque POR", f"{por_attack:.2f}")
mc2.metric("Defensa POR", f"{por_defense:.2f}")
mc3.metric("Ataque COL", f"{col_attack:.2f}")
mc4.metric("Defensa COL", f"{col_defense:.2f}")

mc5, mc6, mc7 = st.columns(3)
mc5.metric("Diff Elo", f"{elo_diff} (POR)")
mc6.metric("Lambda Portugal", f"{lambda_por:.3f}")
mc7.metric("Lambda Colombia", f"{lambda_col:.3f}")

# --- Matriz de probabilidades ---
st.markdown("### Matriz de Probabilidades (%)")

max_goals = 6
matrix = []
for i in range(max_goals):
    row = []
    for j in range(max_goals):
        p = poisson_prob(lambda_por, i) * poisson_prob(lambda_col, j) * 100
        row.append(round(p, 1))
    matrix.append(row)

import pandas as pd
df_matrix = pd.DataFrame(
    matrix,
    index=[f"POR {i}" for i in range(max_goals)],
    columns=[f"COL {j}" for j in range(max_goals)]
)
st.dataframe(df_matrix.style.format("{:.1f}%").background_gradient(cmap="YlOrRd", axis=None), use_container_width=True)

# --- Probabilidades de resultado ---
prob_por_win = 0
prob_draw = 0
prob_col_win = 0
scores_list = []

for i in range(max_goals):
    for j in range(max_goals):
        p = poisson_prob(lambda_por, i) * poisson_prob(lambda_col, j) * 100
        scores_list.append({"Portugal": i, "Colombia": j, "prob": p})
        if i > j:
            prob_por_win += p
        elif i == j:
            prob_draw += p
        else:
            prob_col_win += p

st.markdown("### Probabilidades de Resultado")

rc1, rc2, rc3 = st.columns(3)
rc1.metric("Victoria Portugal", f"{prob_por_win:.1f}%")
rc2.metric("Empate", f"{prob_draw:.1f}%")
rc3.metric("Victoria Colombia", f"{prob_col_win:.1f}%")

# Grafico de barras
probs_df = pd.DataFrame({
    "Resultado": ["Victoria Portugal", "Empate", "Victoria Colombia"],
    "Probabilidad (%)": [prob_por_win, prob_draw, prob_col_win]
})
st.bar_chart(probs_df.set_index("Resultado"), horizontal=True)

# --- Top 5 resultados ---
st.markdown("### Top 5 Marcadores Mas Probables")
scores_list.sort(key=lambda x: -x["prob"])
for rank, s in enumerate(scores_list[:5], 1):
    result_type = "Empate" if s["Portugal"] == s["Colombia"] else ("Gana POR" if s["Portugal"] > s["Colombia"] else "Gana COL")
    st.markdown(f"**{rank}.** Portugal **{s['Portugal']}** - **{s['Colombia']}** Colombia ({s['prob']:.1f}%) [{result_type}]")

# --- Over/Under ---
st.markdown("### Over/Under 2.5 Goles")
prob_under = sum(
    poisson_prob(lambda_por, i) * poisson_prob(lambda_col, j) * 100
    for i in range(max_goals) for j in range(max_goals) if i + j <= 2
)
ou1, ou2 = st.columns(2)
ou1.metric("Under 2.5", f"{prob_under:.1f}%")
ou2.metric("Over 2.5", f"{100 - prob_under:.1f}%")

st.markdown("---")

# ============================
# COMPARACION CON MERCADO
# ============================
st.header("Modelo vs Mercado de Apuestas")

implied_por = 105 / (105 + 100) * 100
implied_col = 100 / (250 + 100) * 100
implied_draw = 100 / (280 + 100) * 100
total_implied = implied_por + implied_col + implied_draw

market_df = pd.DataFrame({
    "Resultado": ["Victoria Portugal", "Empate", "Victoria Colombia"],
    "Modelo (%)": [round(prob_por_win, 1), round(prob_draw, 1), round(prob_col_win, 1)],
    "Mercado (%)": [
        round(implied_por / total_implied * 100, 1),
        round(implied_draw / total_implied * 100, 1),
        round(implied_col / total_implied * 100, 1)
    ],
})
market_df["Diferencia"] = market_df["Modelo (%)"] - market_df["Mercado (%)"]
st.dataframe(market_df.set_index("Resultado"), use_container_width=True)

st.markdown("""
**Lectura:** El modelo Poisson le da mas probabilidad a Portugal y al empate
que las casas de apuestas, y menos a Colombia. Esto se explica porque Portugal
jugaba mas agresivo (necesitaba ganar) mientras Colombia jugaba conservador
(solo necesitaba empatar).
""")

st.markdown("---")

# ============================
# RESULTADO REAL
# ============================
st.header("Resultado Real: Colombia 0 - 0 Portugal")

st.success("""
El partido termino **0-0**. Colombia gano el Grupo K con 7 puntos.
Portugal clasifico segundo con 5 puntos.
""")

st.markdown("""
### Evaluacion del Modelo

| Aspecto | Prediccion | Realidad | Acierto |
|---------|-----------|----------|---------|
| Resultado mas probable | POR 1-0 COL (18.9%) | COL 0-0 POR | No (pero 0-0 fue el #2) |
| Empate como opcion | 29.0% de probabilidad | Empate | Si |
| Under 2.5 goles | 69.5% probabilidad | 0 goles | Si |
| Contexto tactico | COL conservador, POR agresivo | Partido cerrado | Si |

**El 0-0 fue el segundo resultado mas probable del modelo (14.5%).**
El modelo capturo correctamente la tendencia al Under y la alta probabilidad
de empate dado el contexto tactico (Colombia solo necesitaba un punto).
""")

st.markdown("---")

# ============================
# SIGUIENTE RONDA
# ============================
st.header("Siguiente Ronda: Dieciseisavos de Final")

n1, n2 = st.columns(2)
with n1:
    st.subheader("Colombia (1ro Grupo K)")
    st.markdown("vs **Ghana** (3ro Grupo L)")
    st.markdown("_3 julio, Arrowhead Stadium, Kansas City_")

with n2:
    st.subheader("Portugal (2do Grupo K)")
    st.markdown("vs **Croacia** (2do Grupo L)")
    st.markdown("_2 julio, BMO Field, Toronto_")

st.markdown("---")
st.caption("Modelo Poisson bivariado con ajuste Elo y factor tactico. Datos: FIFA, ESPN, Opta, FBref.")
st.caption("Cuotas pre-partido: FanDuel Sportsbook. Fuentes: fifa.com, espn.com, sofascore.com")
