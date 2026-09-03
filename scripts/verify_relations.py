"""Verifica relaciones (FK) reales en una BD de AuditFlow recién migrada."""

import os
import sqlite3
import sys

DB = os.environ.get("CHECK_DB", "relations_check.db")


def main() -> None:
    con = sqlite3.connect(DB)
    cur = con.cursor()
    tables = [r[0] for r in cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'alembic_version'"
    ).fetchall()]

    print("== TABLAS y sus FOREIGN KEYS ==")
    orphan_fks = []
    for t in sorted(tables):
        fks = cur.execute(f"PRAGMA foreign_key_list('{t}')").fetchall()
        if fks:
            for fk in fks:
                # fk: (id, seq, table, from, to, on_update, on_delete, match)
                print(f"  {t}.{fk[3]}  ->  {fk[2]}.{fk[4]}   (on_delete={fk[6]})")
                target_exists = cur.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (fk[2],)
                ).fetchone()
                if not target_exists:
                    orphan_fks.append((t, fk[2], fk[3]))
        else:
            print(f"  {t}  (sin FK)")
    print("\n== tablas sin FK ==")
    for t in sorted(tables):
        if not cur.execute(f"PRAGMA foreign_key_list('{t}')").fetchall():
            print("  ", t)

    print("\n== FK apuntando a tabla inexistente ==")
    print("  ", orphan_fks if orphan_fks else "ninguna")

    print("\n== integridad (foreign_key_check) ==")
    try:
        viol = cur.execute("PRAGMA foreign_key_check").fetchall()
        print("  violaciones:", viol if viol else "ninguna (OK)")
    except Exception as e:
        print("  no aplica:", e)

    con.close()


if __name__ == "__main__":
    main()
