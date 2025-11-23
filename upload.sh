#!/usr/bin/env bash

FTP_HOST="alfa3101.alfahosting-server.de"
FTP_USER="web1065"
FTP_PASS="Nudr5cru"

FTP_REMOTE_DIR="/html/onto"
LOCAL_BASE_DIR="./out"

FILES=(
  "UML_ontology_instances/UML_ontology_instances.svg"
  "UML/master/master.svg"
  "UML_HighLevel/master_highlevel/master_highlevel.svg"
)

lftp -u "$FTP_USER","$FTP_PASS" "$FTP_HOST" <<EOF
cd "$FTP_REMOTE_DIR"
lcd "$LOCAL_BASE_DIR"
$(for f in "${FILES[@]}"; do printf 'put "%s"\n' "$f"; done)
bye
EOF
