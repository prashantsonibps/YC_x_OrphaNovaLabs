import modal

app = modal.App("orphanova")

rdkit_image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "rdkit-pypi", "numpy", "fastapi[standard]"
)


@app.function(image=rdkit_image, timeout=120)
def screen_single_drug(drug: dict) -> dict:
    from rdkit import Chem
    from rdkit.Chem import Descriptors, QED, Lipinski

    name = drug.get("name", "unknown")
    smiles = drug.get("smiles", "")
    mol = Chem.MolFromSmiles(smiles) if smiles else None
    if mol is None:
        return {
            "name": name,
            "smiles": smiles,
            "error": "Invalid SMILES",
            "qed": 0,
            "mw": 0,
            "logp": 0,
            "hbd": 0,
            "hba": 0,
            "lipinski_violations": 5,
            "lipinski_pass": False,
        }

    mw = Descriptors.MolWt(mol)
    logp = Descriptors.MolLogP(mol)
    hbd = Lipinski.NumHDonors(mol)
    hba = Lipinski.NumHAcceptors(mol)
    qed_score = QED.qed(mol)
    violations = sum([mw > 500, logp > 5, hbd > 5, hba > 10])

    return {
        "name": name,
        "smiles": smiles,
        "qed": round(qed_score, 4),
        "mw": round(mw, 2),
        "logp": round(logp, 2),
        "hbd": hbd,
        "hba": hba,
        "lipinski_violations": violations,
        "lipinski_pass": violations <= 1,
    }


@app.function(image=rdkit_image, timeout=300)
@modal.fastapi_endpoint(method="POST")
def screen_drugs(drugs: list[dict]) -> dict:
    results = list(screen_single_drug.map(drugs))
    results.sort(key=lambda x: x.get("qed", 0), reverse=True)
    return {
        "screened": len(results),
        "results": results,
    }
