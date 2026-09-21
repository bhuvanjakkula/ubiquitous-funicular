#!/bin/bash
export PYTHONPATH=/home/workdir

python3 -m scientific_operator.cli rules
python3 -m scientific_operator.cli size --equity 100000 --entry 50 --stop 48
python3 -m scientific_operator.cli recover --loss-pct 20
python3 -m scientific_operator.cli decide --equity 100000 --entry 50 --stop 48 --stock-rs 0.08 --group-rs 0.05
python3 -m scientific_operator.cli decide --regime unstable --stock-rs -0.04 --group-rs -0.07 --tip
python3 -m scientific_operator.cli demo
python3 -m scientific_operator.cli snapshot
python3 -m scientific_operator.cli checklist
python3 -m pytest /home/workdir/scientific_operator/tests -q
