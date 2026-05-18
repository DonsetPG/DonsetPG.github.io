from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "report" / "figures"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


TITLE = font(34, bold=True)
LABEL = font(25, bold=True)
SMALL = font(19)


def wrap(draw: ImageDraw.ImageDraw, text: str, max_width: int, fnt: ImageFont.ImageFont) -> list[str]:
    words = text.split()
    lines: list[str] = []
    line = ""
    for word in words:
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=fnt) <= max_width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def load_image(rel: str) -> Image.Image:
    path = ROOT / rel
    if not path.exists():
        img = Image.new("RGB", (900, 600), "#f5f5f5")
        draw = ImageDraw.Draw(img)
        draw.text((40, 40), f"Missing:\n{rel}", fill="#333333", font=LABEL)
        return img
    img = Image.open(path)
    if img.mode in {"RGBA", "LA"}:
        background = Image.new("RGBA", img.size, "white")
        background.alpha_composite(img.convert("RGBA"))
        img = background.convert("RGB")
    else:
        img = img.convert("RGB")
    return img


def contact_sheet(
    filename: str,
    title: str,
    items: Iterable[tuple[str, str]],
    cols: int,
    tile_w: int = 1050,
    tile_h: int = 690,
) -> None:
    items = list(items)
    rows = (len(items) + cols - 1) // cols
    pad = 34
    header_h = 86
    label_h = 78
    w = cols * tile_w + (cols + 1) * pad
    h = header_h + rows * (tile_h + label_h) + (rows + 1) * pad
    sheet = Image.new("RGB", (w, h), "#fbfbf8")
    draw = ImageDraw.Draw(sheet)

    draw.rectangle((0, 0, w, header_h), fill="#20252b")
    draw.text((pad, 23), title, fill="#ffffff", font=TITLE)

    for idx, (rel, label) in enumerate(items):
        r, c = divmod(idx, cols)
        x = pad + c * (tile_w + pad)
        y = header_h + pad + r * (tile_h + label_h + pad)
        draw.rounded_rectangle((x, y, x + tile_w, y + tile_h + label_h), radius=18, fill="#ffffff", outline="#d8d8d2", width=2)
        img = load_image(rel)
        img = ImageOps.contain(img, (tile_w - 30, tile_h - 30), method=Image.Resampling.LANCZOS)
        ix = x + (tile_w - img.width) // 2
        iy = y + 15 + (tile_h - 30 - img.height) // 2
        sheet.paste(img, (ix, iy))
        for line_no, line in enumerate(wrap(draw, label, tile_w - 40, LABEL)[:2]):
            draw.text((x + 20, y + tile_h + 15 + line_no * 28), line, fill="#20252b", font=LABEL)

    # A small provenance tag keeps screenshots traceable without eating report space.
    draw.text((w - 620, h - 26), "Generated from checked-in run artifacts", fill="#696969", font=SMALL)
    sheet.save(OUT / filename, quality=96)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    contact_sheet(
        "fluidgym_replay_gallery.png",
        "FluidGym selected heuristic replays",
        [
            ("cylinder_rot_2d_easy_24h/final_action_drag_timeseries.png", "CylinderRot2D easy: action, drag, lift"),
            ("cylinder_jet_2d_easy/plot-to-do-heuristic.png", "CylinderJet2D easy: heuristic replay"),
            ("cylinder_jet_2d_medium_24h_improvement/heuristic_eval_sequence_plot/plot-to-do-heuristic-medium.png", "CylinderJet2D medium: heuristic vs baseflow"),
            ("rbc_2d_easy_24h_final/final_plots/best_heuristic_todo_style.png", "RBC2D easy: temperature feedback"),
            ("rbc_2d_medium_transfer_50k/plots/rbc2d_medium_training_reward_with_legend_25k.png", "RBC2D medium: transferred search trace"),
            ("tcf_small_3d_both_easy_heuristic_package/run_artifacts/dreduc_with_heuristic_rescaled_axis.png", "TCFSmall3D both easy: drag reduction"),
        ],
        cols=2,
        tile_w=1120,
        tile_h=680,
    )

    contact_sheet(
        "fluidgym_strategy_gallery.png",
        "FluidGym policy anatomy",
        [
            ("best_heuristic_strategy_notes/plots/cylinder_rot_2d_easy_strategy.png", "Cylinder rotation PID plus carrier"),
            ("best_heuristic_strategy_notes/plots/cylinder_jet_2d_easy_strategy.png", "Easy jet lift-proxy damping"),
            ("best_heuristic_strategy_notes/plots/cylinder_jet_2d_medium_strategy.png", "Medium jet PID lift damping"),
            ("best_heuristic_strategy_notes/plots/rbc_2d_easy_strategy.png", "RBC spatial temperature feedback"),
            ("cylinder_jet_2d_easy/best_policy_parameter_neighborhood.png", "Easy jet parameter neighborhood"),
            ("cylinder_jet_2d_medium_24h_improvement/best_policy_parameter_neighborhood.png", "Medium jet parameter neighborhood"),
            ("rbc_2d_medium_transfer_50k/plots/heatmap_gain_vs_smoothing.png", "RBC medium gain-smoothing map"),
            ("rbc_2d_medium_transfer_50k/plots/controller_family_ablation.png", "RBC medium controller families"),
        ],
        cols=2,
        tile_w=1120,
        tile_h=660,
    )

    contact_sheet(
        "beacon_replay_gallery.png",
        "Beacon replay traces and target-search plots",
        [
            ("beacon/plots/lorenz_reward_per_step.png", "Lorenz reward per step"),
            ("beacon/rayleigh_target_minus_100/plots/rayleigh_reward_research_curves.png", "Rayleigh modal search vs target"),
            ("beacon/paper_reproductions/outputs/reward_mixing_with_heuristic_caption.png", "Mixing paper-style overlay"),
            ("beacon/plots/burgers_reward_per_step.png", "Burgers reward per step"),
            ("beacon/plots/sloshing_reward_per_step.png", "Sloshing reward per step"),
            ("beacon/vortex_heuristic_report/vortex_total_reward_curve.png", "Vortex slow phase-drift search"),
        ],
        cols=3,
        tile_w=950,
        tile_h=570,
    )

    contact_sheet(
        "beacon_strategy_gallery.png",
        "Beacon policy anatomy and paper-style overlays",
        [
            ("beacon/heuristic_strategy_descriptions/lorenz_strategy.png", "Lorenz threshold state machine"),
            ("beacon/heuristic_strategy_descriptions/rayleigh_strategy.png", "Rayleigh Fourier feedback"),
            ("beacon/rayleigh_target_minus_100/plots/rayleigh_reward_research_curves.png", "Rayleigh modal PD search"),
            ("beacon/vortex_heuristic_report/vortex_total_reward_curve.png", "Vortex phase-drift learning curve"),
            ("beacon/paper_reproductions/outputs/reward_overview.png", "Beacon reward overview overlay"),
            ("beacon/shkadov_stable_search/stable_feedback_sample_efficiency_reproduction.png", "Shkadov stable feedback discovery"),
        ],
        cols=2,
        tile_w=1120,
        tile_h=640,
    )

    contact_sheet(
        "shkadov_gallery.png",
        "Shkadov stable feedback diagnostics",
        [
            ("beacon/shkadov_stable_search/stable_feedback_seed_sweep_0_137.png", "5-act stable feedback seeds 0..137"),
            ("beacon/shkadov_stable_search/stable_feedback_total_reward_per_step_0_49.png", "5-act stable vs no-control reward"),
            ("beacon/shkadov_stable_search/stable_feedback_sample_efficiency_reproduction.png", "5-act discovery accounting"),
            ("beacon/shkadov_stable_search/stable_feedback_spliced_after_110k_cap_200k.png", "Old search spliced with stable refinement"),
            ("beacon/shkadov_stable_search/ten_actuator_adaptation/stable_feedback_10act_seed_sweep.png", "10-act adaptation seeds 0..49"),
            ("beacon/shkadov_stable_search/ten_actuator_adaptation/search_10act_adaptation_accounting.png", "10-act adaptation accounting"),
        ],
        cols=2,
        tile_w=1120,
        tile_h=650,
    )


if __name__ == "__main__":
    main()
