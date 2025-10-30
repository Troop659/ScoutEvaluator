import logging

from quart import Quart, render_template, request

app = Quart(__name__)
logging.basicConfig(level=logging.INFO)

CATEGORIES: dict[str, float] = {
    "communication": 0.9975,
    "kindness": 0.38,
    "teaching": 0.6175,
    "responsibility": 0.665,
    "commitment": 0.38,
    "leading by example": 0.7125,
    "attendance": 2.025,
    "overall": 0.3325
}

RANKS_REQ: dict[str, int] = {
    "star": 70,
    "life": 80
}

ADULT_WEIGHT_TOTAL: float = 1.38


@app.route("/")
async def index():
    return await render_template(
        "eval.html", ranks=RANKS_REQ, categories=CATEGORIES
    )


@app.route("/calculate-score", methods=["POST"])
async def calculate_score():
    form = await request.form

    name = form.get("name", "")
    rank = form.get("rank", "")
    cat_values = {cat: float(form.get(cat, 0)) for cat in CATEGORIES}
    adult_names = form.getlist("adult_name")
    adult_values = [
        float(v) for v in form.getlist("adult_rating") if v.strip()
    ]
    adult_info = list(zip(adult_names, adult_values))

    return {
        "score": calculate_score_helper(rank, cat_values, adult_values)
    }


def calculate_score_helper(
            rank: str,
            cat_values: dict[str, float],
            adult_values: list[float]
        ) -> tuple[float, float, bool]:

    total_score = 0
    weight_sum = 0

    total_score = sum(
        score * CATEGORIES[cat] for cat, score in cat_values.items()
    )
    weight_sum += sum(list(CATEGORIES.values()))

    if adult_values:
        per_adult = ADULT_WEIGHT_TOTAL / len(adult_values)

        total_score += sum(score * per_adult for score in adult_values)
        weight_sum += ADULT_WEIGHT_TOTAL

    total_score = (total_score / weight_sum) * 10 if weight_sum else 0

    rank_req = RANKS_REQ[rank]

    return total_score, rank_req, total_score >= rank_req


if __name__ == "__main__":
    app.run(debug=True)
