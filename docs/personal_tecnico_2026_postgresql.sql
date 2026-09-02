-- ========================================================
-- Personal Técnico 2026 · estructura normalizada
-- Generado automáticamente desde Personal Técnico 2026.xlsx
-- ========================================================
SET client_encoding = 'UTF8';

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id   BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Áreas
CREATE TABLE IF NOT EXISTS areas (
    id     BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(150)
);

-- 3. Personas
CREATE TABLE IF NOT EXISTS personal (
    id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nombre_completo VARCHAR(200) NOT NULL,
    celular         VARCHAR(30),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_personal_celular ON personal (celular);

-- 4. Correos
CREATE TABLE IF NOT EXISTS personal_emails (
    id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    personal_id BIGINT NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL UNIQUE CHECK (email = lower(email)),
    principal   BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_personal_emails_principal
  ON personal_emails (personal_id) WHERE principal = TRUE;

-- 5. Persona <-> Rol
CREATE TABLE IF NOT EXISTS personal_roles (
    personal_id BIGINT NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    rol_id      BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    PRIMARY KEY (personal_id, rol_id)
);
CREATE INDEX IF NOT EXISTS ix_personal_roles_rol ON personal_roles (rol_id);

-- 6. Persona <-> Área
CREATE TABLE IF NOT EXISTS personal_areas (
    personal_id BIGINT NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    area_id     BIGINT NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
    PRIMARY KEY (personal_id, area_id)
);
CREATE INDEX IF NOT EXISTS ix_personal_areas_area ON personal_areas (area_id);

-- Datos: roles
INSERT INTO roles (nombre) VALUES ('EVALUADOR');
INSERT INTO roles (nombre) VALUES ('INSTRUCTOR');
INSERT INTO roles (nombre) VALUES ('INSPECTOR');
INSERT INTO roles (nombre) VALUES ('EXAMINADOR');

-- Datos: áreas
INSERT INTO areas (codigo, nombre) VALUES ('SG', 'Sistema de Gestión');
INSERT INTO areas (codigo, nombre) VALUES ('NN', 'Norma Nacional');
INSERT INTO areas (codigo, nombre) VALUES ('CIFA', 'CIFA');
INSERT INTO areas (codigo, nombre) VALUES ('SECTOR', 'Sector');

-- Datos: personas
INSERT INTO personal (nombre_completo, celular) VALUES ('ALBERTO CANALES SÁNCHEZ', '722 769 0524');
INSERT INTO personal (nombre_completo, celular) VALUES ('ALEJANDRINA VÁSQUEZ LIRA', '722 228 7380');
INSERT INTO personal (nombre_completo, celular) VALUES ('ALFONSO MARCOS ORTEGA CAMPOS', '55 3291 8762');
INSERT INTO personal (nombre_completo, celular) VALUES ('ANDREA RODRÍGUEZ CALDERÓN', '55 2953 8909');
INSERT INTO personal (nombre_completo, celular) VALUES ('BLANCA ESTELA VIEYRA VIEYRA', '55 4453 0883');
INSERT INTO personal (nombre_completo, celular) VALUES ('CLAUDIA VERÓNICA DE LA O PÉREZ', '55 3223 2208');
INSERT INTO personal (nombre_completo, celular) VALUES ('CLAUDIO AQUILES ESCALANTE TOVAR', '55 5412 8271');
INSERT INTO personal (nombre_completo, celular) VALUES ('DANIEL ISRAEL LAORRAVAQUIO RAMÍREZ', '55 4506 1526');
INSERT INTO personal (nombre_completo, celular) VALUES ('DAVID MORENO MORALES', '55 3202 2309');
INSERT INTO personal (nombre_completo, celular) VALUES ('DAVID OBREGÓN GARCÍA', '55 2746 9452');
INSERT INTO personal (nombre_completo, celular) VALUES ('DAVID ROBERTO MEZA PADRÓN', '933 111 0594');
INSERT INTO personal (nombre_completo, celular) VALUES ('DENNIS AMELIA NARVÁEZ SUÁREZ', '55 2128 8117');
INSERT INTO personal (nombre_completo, celular) VALUES ('DEMETRIO QUINTERO CORREA', '55 4517 5939');
INSERT INTO personal (nombre_completo, celular) VALUES ('DOLORES MARTÍNEZ BUCIO', '55 3998 8935');
INSERT INTO personal (nombre_completo, celular) VALUES ('EDGAR ARCOS TOLEDO', '55 4192 5626');
INSERT INTO personal (nombre_completo, celular) VALUES ('EDGAR ROBERTO CÁRDENAS AGUIRRE', '55 4599 2726');
INSERT INTO personal (nombre_completo, celular) VALUES ('EDUARDO SOTO CORREA', '55 8354 1961');
INSERT INTO personal (nombre_completo, celular) VALUES ('FABIÁN HERNÁNDEZ COLOTLA', '55 2107 8137');
INSERT INTO personal (nombre_completo, celular) VALUES ('FILIBERTO RODRÍGUEZ OCHOA', '55 9108 8370');
INSERT INTO personal (nombre_completo, celular) VALUES ('FRANCISCO GARCÍA YLLESCAS', '55 5453 6278');
INSERT INTO personal (nombre_completo, celular) VALUES ('GILBERTO ROBLES GUTIÉRREZ', '662 124 2363');
INSERT INTO personal (nombre_completo, celular) VALUES ('GISELE ORTÍZ OSEGUERA', '998 125 3858');
INSERT INTO personal (nombre_completo, celular) VALUES ('HUGO MIGUEL TENORIO ROSALES', '55 6371 4324');
INSERT INTO personal (nombre_completo, celular) VALUES ('IRIS SAGRARIO ESPINOSA CORRO', '55 1013 2469');
INSERT INTO personal (nombre_completo, celular) VALUES ('IVONNE ACEVEDO GUZMÁN', '55 4342 4612');
INSERT INTO personal (nombre_completo, celular) VALUES ('JAIME RAMÍREZ SILVA', '55 4340 1669');
INSERT INTO personal (nombre_completo, celular) VALUES ('JENRRY ANTONIO BARRIOS', '55 8347 4988');
INSERT INTO personal (nombre_completo, celular) VALUES ('JORGE ARZATE PÉREZ', '63 4345 8421');
INSERT INTO personal (nombre_completo, celular) VALUES ('JOSÉ LUIS HERNÁNDEZ SÁNCHEZ', '55 3199 3893');
INSERT INTO personal (nombre_completo, celular) VALUES ('JOSÉ MANUEL GONZÁLEZ RUIZ', '55 4346 1685');
INSERT INTO personal (nombre_completo, celular) VALUES ('JUANA DANIELA PARRA GARCIAFIGUEROA', '55 2254 7473');
INSERT INTO personal (nombre_completo, celular) VALUES ('LUIS ALFREDO RODRIGUEZ REYES', '462 600 1377');
INSERT INTO personal (nombre_completo, celular) VALUES ('MADAI CORRO LABRA', NULL);
INSERT INTO personal (nombre_completo, celular) VALUES ('MARCO ANTONIO HERNÁNDEZ VARGAS', '55 1850 6792');
INSERT INTO personal (nombre_completo, celular) VALUES ('MARÍA DE LOURDES ZARCO CASTILLO', '55 3560 6156');
INSERT INTO personal (nombre_completo, celular) VALUES ('MARTÍN EDUARDO CASTORENA', '55 1451 5402');
INSERT INTO personal (nombre_completo, celular) VALUES ('MIGUEL ÁNGEL FLORES LEMUS', '55 5107 1661');
INSERT INTO personal (nombre_completo, celular) VALUES ('MIGUEL ÁNGEL ROA HERNÁNDEZ', '55 1829 4899');
INSERT INTO personal (nombre_completo, celular) VALUES ('MÓNICA LYENET PÉREZ VÁZQUEZ', '55 3012 5675');
INSERT INTO personal (nombre_completo, celular) VALUES ('NORMA ANGÉLICA OLMEDO DÍAZ', '55 1654 3747');
INSERT INTO personal (nombre_completo, celular) VALUES ('PEDRO ROSAS NIETO', '222 455 6711');
INSERT INTO personal (nombre_completo, celular) VALUES ('ROBERTO ROSALES GONZÁLEZ', '55 5405 8966');
INSERT INTO personal (nombre_completo, celular) VALUES ('ROCÍO ELENA GAONA RAMÍREZ', '55 3722 9414');
INSERT INTO personal (nombre_completo, celular) VALUES ('ROSÁNGEL GARCÍA CRUZ', '55 1814 6452');
INSERT INTO personal (nombre_completo, celular) VALUES ('SOCORRO ISABEL ROJAS DOMÍNGUEZ', '55 6249 2409');
INSERT INTO personal (nombre_completo, celular) VALUES ('VÍCTOR BALTAZAR ESCOBAR', '55 3044 9275');
INSERT INTO personal (nombre_completo, celular) VALUES ('VIRGINIA MENDOZA HERNÁNDEZ', '222 191 4523');

-- Datos: correos (principal = primer correo)
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'acanaless780@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'ALBERTO CANALES SÁNCHEZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'acanaless780@outlook.es', FALSE FROM personal p WHERE p.nombre_completo = 'ALBERTO CANALES SÁNCHEZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'alejandrina.vasquez@live.com.mx', TRUE FROM personal p WHERE p.nombre_completo = 'ALEJANDRINA VÁSQUEZ LIRA';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'amocampos23@yahoo.com.mx', TRUE FROM personal p WHERE p.nombre_completo = 'ALFONSO MARCOS ORTEGA CAMPOS';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'rocandy08@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'ANDREA RODRÍGUEZ CALDERÓN';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'rocandy08@hotmail.com', FALSE FROM personal p WHERE p.nombre_completo = 'ANDREA RODRÍGUEZ CALDERÓN';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'blanca_imnc@yahoo.com.mx', TRUE FROM personal p WHERE p.nombre_completo = 'BLANCA ESTELA VIEYRA VIEYRA';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'cvdelao@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'CLAUDIA VERÓNICA DE LA O PÉREZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'sciterra.terra@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'CLAUDIO AQUILES ESCALANTE TOVAR';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'daniel.laorravaquio@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'DANIEL ISRAEL LAORRAVAQUIO RAMÍREZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'cosoem@hotmail.com', FALSE FROM personal p WHERE p.nombre_completo = 'DANIEL ISRAEL LAORRAVAQUIO RAMÍREZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'dmmorales66@hotmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'DAVID MORENO MORALES';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'casiga.si@hotmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'DAVID OBREGÓN GARCÍA';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'drmezap@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'DAVID ROBERTO MEZA PADRÓN';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'david.rmp@outlook.com', FALSE FROM personal p WHERE p.nombre_completo = 'DAVID ROBERTO MEZA PADRÓN';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'dennis.narvaez@yahoo.com', TRUE FROM personal p WHERE p.nombre_completo = 'DENNIS AMELIA NARVÁEZ SUÁREZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'demetrio.quintero.correa@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'DEMETRIO QUINTERO CORREA';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'doloresmarbucio@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'DOLORES MARTÍNEZ BUCIO';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'hpermea.consultores@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'EDGAR ARCOS TOLEDO';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'edgarcos@prodigy.net.mx', FALSE FROM personal p WHERE p.nombre_completo = 'EDGAR ARCOS TOLEDO';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'yaraminda@yahoo.com.mx', TRUE FROM personal p WHERE p.nombre_completo = 'EDGAR ROBERTO CÁRDENAS AGUIRRE';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'esoto.spc@hotmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'EDUARDO SOTO CORREA';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'fabcolotla@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'FABIÁN HERNÁNDEZ COLOTLA';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'fabcolotla@outlook.com', FALSE FROM personal p WHERE p.nombre_completo = 'FABIÁN HERNÁNDEZ COLOTLA';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'frodriguez@imeec.org.mx', TRUE FROM personal p WHERE p.nombre_completo = 'FILIBERTO RODRÍGUEZ OCHOA';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'fgyllescas@yahoo.com.mx', TRUE FROM personal p WHERE p.nombre_completo = 'FRANCISCO GARCÍA YLLESCAS';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'fgyllescas@gmail.com', FALSE FROM personal p WHERE p.nombre_completo = 'FRANCISCO GARCÍA YLLESCAS';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'gilberto.robles@cfe.mx', TRUE FROM personal p WHERE p.nombre_completo = 'GILBERTO ROBLES GUTIÉRREZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'grgcfe@yahoo.com', FALSE FROM personal p WHERE p.nombre_completo = 'GILBERTO ROBLES GUTIÉRREZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'gisortiz.playasmx@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'GISELE ORTÍZ OSEGUERA';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'qa_hugo@hotmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'HUGO MIGUEL TENORIO ROSALES';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'isecmx@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'IRIS SAGRARIO ESPINOSA CORRO';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'isecmx@yahoo.com', FALSE FROM personal p WHERE p.nombre_completo = 'IRIS SAGRARIO ESPINOSA CORRO';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'inocuidadivonne@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'IVONNE ACEVEDO GUZMÁN';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'jaimermrzslv@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'JAIME RAMÍREZ SILVA';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'jenrry.barrios@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'JENRRY ANTONIO BARRIOS';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'jorgearzate52@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'JORGE ARZATE PÉREZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'sukutum1505@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'JOSÉ LUIS HERNÁNDEZ SÁNCHEZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'joma.calidad@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'JOSÉ MANUEL GONZÁLEZ RUIZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'jdaniela.parra@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'JUANA DANIELA PARRA GARCIAFIGUEROA';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'lurorey@hotmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'LUIS ALFREDO RODRIGUEZ REYES';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'info@adamicorro.com.mx', TRUE FROM personal p WHERE p.nombre_completo = 'MADAI CORRO LABRA';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'hdezmarco1966@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'MARCO ANTONIO HERNÁNDEZ VARGAS';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'marco.hernandez@prodigy.net.mx', FALSE FROM personal p WHERE p.nombre_completo = 'MARCO ANTONIO HERNÁNDEZ VARGAS';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'lourdes_zc@hotmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'MARÍA DE LOURDES ZARCO CASTILLO';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'eduardo_castoren@hotmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'MARTÍN EDUARDO CASTORENA';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'miguelangflores@hotmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'MIGUEL ÁNGEL FLORES LEMUS';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'miguelangflores@yahoo.com', FALSE FROM personal p WHERE p.nombre_completo = 'MIGUEL ÁNGEL FLORES LEMUS';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'miguelangelroa66@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'MIGUEL ÁNGEL ROA HERNÁNDEZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'monica.perez@assig.com.mx', TRUE FROM personal p WHERE p.nombre_completo = 'MÓNICA LYENET PÉREZ VÁZQUEZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'normaolmedo@yahoo.com', TRUE FROM personal p WHERE p.nombre_completo = 'NORMA ANGÉLICA OLMEDO DÍAZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'naolmedo63@gmail.com', FALSE FROM personal p WHERE p.nombre_completo = 'NORMA ANGÉLICA OLMEDO DÍAZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'rosasnieto@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'PEDRO ROSAS NIETO';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'imncrrg@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'ROBERTO ROSALES GONZÁLEZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'rosales@ipdem.com.mx', FALSE FROM personal p WHERE p.nombre_completo = 'ROBERTO ROSALES GONZÁLEZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'helenrg2213@gmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'ROCÍO ELENA GAONA RAMÍREZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'rocio.gaona@hotmail.com', FALSE FROM personal p WHERE p.nombre_completo = 'ROCÍO ELENA GAONA RAMÍREZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'desarrollo@compass-red.com', TRUE FROM personal p WHERE p.nombre_completo = 'ROSÁNGEL GARCÍA CRUZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'socorro.rojas@hotmail.com', TRUE FROM personal p WHERE p.nombre_completo = 'SOCORRO ISABEL ROJAS DOMÍNGUEZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'rojasdominguezsocorro@gmail.com', FALSE FROM personal p WHERE p.nombre_completo = 'SOCORRO ISABEL ROJAS DOMÍNGUEZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'vicbal@vicbalcalidad.com', TRUE FROM personal p WHERE p.nombre_completo = 'VÍCTOR BALTAZAR ESCOBAR';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'vmenher@yahoo.com.mx', TRUE FROM personal p WHERE p.nombre_completo = 'VIRGINIA MENDOZA HERNÁNDEZ';
INSERT INTO personal_emails (personal_id, email, principal)
  SELECT p.id, 'virginia.mendoza@puebla.tecnm.mx', FALSE FROM personal p WHERE p.nombre_completo = 'VIRGINIA MENDOZA HERNÁNDEZ';

-- Datos: persona <-> rol
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'ALBERTO CANALES SÁNCHEZ' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'ALEJANDRINA VÁSQUEZ LIRA' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'ALFONSO MARCOS ORTEGA CAMPOS' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'ANDREA RODRÍGUEZ CALDERÓN' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'BLANCA ESTELA VIEYRA VIEYRA' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'CLAUDIA VERÓNICA DE LA O PÉREZ' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'CLAUDIA VERÓNICA DE LA O PÉREZ' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'CLAUDIO AQUILES ESCALANTE TOVAR' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'CLAUDIO AQUILES ESCALANTE TOVAR' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'DANIEL ISRAEL LAORRAVAQUIO RAMÍREZ' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'DAVID MORENO MORALES' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'DAVID OBREGÓN GARCÍA' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'DAVID OBREGÓN GARCÍA' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'DAVID ROBERTO MEZA PADRÓN' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'DAVID ROBERTO MEZA PADRÓN' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'DENNIS AMELIA NARVÁEZ SUÁREZ' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'DEMETRIO QUINTERO CORREA' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'DOLORES MARTÍNEZ BUCIO' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'EDGAR ARCOS TOLEDO' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'EDGAR ROBERTO CÁRDENAS AGUIRRE' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'EDUARDO SOTO CORREA' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'FABIÁN HERNÁNDEZ COLOTLA' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'FILIBERTO RODRÍGUEZ OCHOA' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'FRANCISCO GARCÍA YLLESCAS' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'GILBERTO ROBLES GUTIÉRREZ' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'GISELE ORTÍZ OSEGUERA' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'HUGO MIGUEL TENORIO ROSALES' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'IRIS SAGRARIO ESPINOSA CORRO' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'IVONNE ACEVEDO GUZMÁN' AND r.nombre = 'INSPECTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'JAIME RAMÍREZ SILVA' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'JENRRY ANTONIO BARRIOS' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'JORGE ARZATE PÉREZ' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'JOSÉ LUIS HERNÁNDEZ SÁNCHEZ' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'JOSÉ MANUEL GONZÁLEZ RUIZ' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'JOSÉ MANUEL GONZÁLEZ RUIZ' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'JOSÉ MANUEL GONZÁLEZ RUIZ' AND r.nombre = 'EXAMINADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'JUANA DANIELA PARRA GARCIAFIGUEROA' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'JUANA DANIELA PARRA GARCIAFIGUEROA' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'LUIS ALFREDO RODRIGUEZ REYES' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'MADAI CORRO LABRA' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'MARCO ANTONIO HERNÁNDEZ VARGAS' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'MARÍA DE LOURDES ZARCO CASTILLO' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'MARTÍN EDUARDO CASTORENA' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'MIGUEL ÁNGEL FLORES LEMUS' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'MIGUEL ÁNGEL ROA HERNÁNDEZ' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'MÓNICA LYENET PÉREZ VÁZQUEZ' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'MÓNICA LYENET PÉREZ VÁZQUEZ' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'NORMA ANGÉLICA OLMEDO DÍAZ' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'NORMA ANGÉLICA OLMEDO DÍAZ' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'PEDRO ROSAS NIETO' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'ROBERTO ROSALES GONZÁLEZ' AND r.nombre = 'EVALUADOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'ROBERTO ROSALES GONZÁLEZ' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'ROCÍO ELENA GAONA RAMÍREZ' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'ROSÁNGEL GARCÍA CRUZ' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'SOCORRO ISABEL ROJAS DOMÍNGUEZ' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'VÍCTOR BALTAZAR ESCOBAR' AND r.nombre = 'INSTRUCTOR';
INSERT INTO personal_roles (personal_id, rol_id)
  SELECT p.id, r.id FROM personal p CROSS JOIN roles r
  WHERE p.nombre_completo = 'VIRGINIA MENDOZA HERNÁNDEZ' AND r.nombre = 'EVALUADOR';

-- Datos: persona <-> área
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'ALBERTO CANALES SÁNCHEZ' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'ALEJANDRINA VÁSQUEZ LIRA' AND a.codigo = 'NN';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'ALFONSO MARCOS ORTEGA CAMPOS' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'ANDREA RODRÍGUEZ CALDERÓN' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'BLANCA ESTELA VIEYRA VIEYRA' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'CLAUDIA VERÓNICA DE LA O PÉREZ' AND a.codigo = 'NN';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'CLAUDIA VERÓNICA DE LA O PÉREZ' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'CLAUDIO AQUILES ESCALANTE TOVAR' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'CLAUDIO AQUILES ESCALANTE TOVAR' AND a.codigo = 'NN';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'CLAUDIO AQUILES ESCALANTE TOVAR' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'DANIEL ISRAEL LAORRAVAQUIO RAMÍREZ' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'DAVID MORENO MORALES' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'DAVID OBREGÓN GARCÍA' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'DAVID OBREGÓN GARCÍA' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'DAVID ROBERTO MEZA PADRÓN' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'DAVID ROBERTO MEZA PADRÓN' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'DENNIS AMELIA NARVÁEZ SUÁREZ' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'DEMETRIO QUINTERO CORREA' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'DOLORES MARTÍNEZ BUCIO' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'EDGAR ARCOS TOLEDO' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'EDGAR ROBERTO CÁRDENAS AGUIRRE' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'EDGAR ROBERTO CÁRDENAS AGUIRRE' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'EDUARDO SOTO CORREA' AND a.codigo = 'NN';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'FABIÁN HERNÁNDEZ COLOTLA' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'FILIBERTO RODRÍGUEZ OCHOA' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'FRANCISCO GARCÍA YLLESCAS' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'FRANCISCO GARCÍA YLLESCAS' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'GILBERTO ROBLES GUTIÉRREZ' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'GISELE ORTÍZ OSEGUERA' AND a.codigo = 'NN';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'HUGO MIGUEL TENORIO ROSALES' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'IRIS SAGRARIO ESPINOSA CORRO' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'IVONNE ACEVEDO GUZMÁN' AND a.codigo = 'NN';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'JAIME RAMÍREZ SILVA' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'JENRRY ANTONIO BARRIOS' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'JORGE ARZATE PÉREZ' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'JOSÉ LUIS HERNÁNDEZ SÁNCHEZ' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'JOSÉ MANUEL GONZÁLEZ RUIZ' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'JOSÉ MANUEL GONZÁLEZ RUIZ' AND a.codigo = 'NN';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'JOSÉ MANUEL GONZÁLEZ RUIZ' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'JUANA DANIELA PARRA GARCIAFIGUEROA' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'JUANA DANIELA PARRA GARCIAFIGUEROA' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'LUIS ALFREDO RODRIGUEZ REYES' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'MADAI CORRO LABRA' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'MARCO ANTONIO HERNÁNDEZ VARGAS' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'MARÍA DE LOURDES ZARCO CASTILLO' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'MARTÍN EDUARDO CASTORENA' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'MARTÍN EDUARDO CASTORENA' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'MIGUEL ÁNGEL FLORES LEMUS' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'MIGUEL ÁNGEL ROA HERNÁNDEZ' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'MIGUEL ÁNGEL ROA HERNÁNDEZ' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'MÓNICA LYENET PÉREZ VÁZQUEZ' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'MÓNICA LYENET PÉREZ VÁZQUEZ' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'NORMA ANGÉLICA OLMEDO DÍAZ' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'NORMA ANGÉLICA OLMEDO DÍAZ' AND a.codigo = 'NN';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'NORMA ANGÉLICA OLMEDO DÍAZ' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'PEDRO ROSAS NIETO' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'ROBERTO ROSALES GONZÁLEZ' AND a.codigo = 'SG';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'ROBERTO ROSALES GONZÁLEZ' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'ROCÍO ELENA GAONA RAMÍREZ' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'ROSÁNGEL GARCÍA CRUZ' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'SOCORRO ISABEL ROJAS DOMÍNGUEZ' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'VÍCTOR BALTAZAR ESCOBAR' AND a.codigo = 'CIFA';
INSERT INTO personal_areas (personal_id, area_id)
  SELECT p.id, a.id FROM personal p CROSS JOIN areas a
  WHERE p.nombre_completo = 'VIRGINIA MENDOZA HERNÁNDEZ' AND a.codigo = 'SG';
