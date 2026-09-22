import {
  AdminMember,
  Candidate,
  ElectionConfig,
  JuradoMember,
  PollingStation,
  Position,
  Student
} from '../types/election';

export const ALL_GRADES = [
  'Pre-Jardín',
  'Jardín',
  'Transición',
  '1°',
  '2°',
  '3°',
  '4°',
  '5°',
  '6°',
  '7°',
  '8°',
  '9°',
  '10°',
  '11°'
];

export const POLLING_STATIONS: PollingStation[] = [
  {
    id: 'puesto-casa-ninos',
    name: 'Casa de niños (Guarderia)',
    shortName: 'Casa de niños',
    category: 'Preescolar',
    gradesCovered: ['Pre-Jardín', 'Jardín', 'Transición'],
    mesas: [1, 2, 3],
    description: 'Puesto de votación para nivel Preescolar / Guardería (Comunidad Infantil y Casa de Niños). Mesas 01, 02 y 03.'
  },
  {
    id: 'puesto-taller-1',
    name: 'Taller 1 (Primaria)',
    shortName: 'Taller 1',
    category: 'Primaria',
    gradesCovered: ['1°', '2°', '3°'],
    mesas: [4, 5, 6, 7],
    description: 'Puesto de votación para Primaria básica inicial (Grados 1°, 2° y 3°). Mesas 04, 05, 06 y 07.'
  },
  {
    id: 'puesto-taller-2',
    name: 'Taller 2 (Primaria)',
    shortName: 'Taller 2',
    category: 'Primaria',
    gradesCovered: ['4°', '5°'],
    mesas: [8, 9, 10, 11],
    description: 'Puesto de votación para Primaria básica superior (Grados 4° y 5°). Mesas 08, 09, 10 y 11.'
  },
  {
    id: 'puesto-taller-3',
    name: 'Taller 3 (Bachillerato medio)',
    shortName: 'Taller 3',
    category: 'Bachillerato medio',
    gradesCovered: ['6°', '7°'],
    mesas: [12, 13, 14],
    description: 'Puesto de votación para Secundaria ciclo 1 (Grados 6° y 7°). Mesas 12, 13 y 14.'
  },
  {
    id: 'puesto-taller-4',
    name: 'Taller 4 (Bachillerato medio)',
    shortName: 'Taller 4',
    category: 'Bachillerato medio',
    gradesCovered: ['8°', '9°'],
    mesas: [15, 16, 17],
    description: 'Puesto de votación para Secundaria ciclo 2 (Grados 8° y 9°). Mesas 15, 16 y 17.'
  },
  {
    id: 'puesto-taller-5',
    name: 'Taller 5 (bachillerato alto)',
    shortName: 'Taller 5',
    category: 'Bachillerato alto',
    gradesCovered: ['10°', '11°'],
    mesas: [18, 19, 20],
    description: 'Puesto de votación para Educación Media y Graduandos (Grados 10° y 11°). Mesas 18, 19 y 20.'
  }
];

export function getStationForMesa(mesaNumber: number): PollingStation {
  const found = POLLING_STATIONS.find(s => s.mesas.includes(mesaNumber));
  return found || POLLING_STATIONS[0];
}

export function getStationForGrade(grade: string): PollingStation {
  const found = POLLING_STATIONS.find(s => s.gradesCovered.includes(grade));
  return found || POLLING_STATIONS[0];
}

export const INITIAL_POSITIONS: Position[] = [
  {
    id: 'personeria',
    title: 'Personero(a) de los Estudiantes',
    shortTitle: 'Personería Estudiantil',
    legalBasis: 'Ley 115 de 1994, Art. 142 - Decreto 1860 de 1994, Art. 28',
    description: 'Encargado de promover el ejercicio de los deberes y derechos de los estudiantes consagrados en la Constitución Política, leyes, decretos y el Manual de Convivencia Escolar.',
    eligibleGrades: ALL_GRADES,
    color: '#7e22ce' // purple-700
  },
  {
    id: 'contraloria',
    title: 'Contralor(a) Escolar',
    shortTitle: 'Contraloría Estudiantil',
    legalBasis: 'Ley 2195 de 2022 - Ordenanzas Departamentales y Acuerdos de Veeduría',
    description: 'Lidera la veeduría fiscal participativa sobre el buen uso de los recursos de la institución, fondos de servicios docentes y el Programa de Alimentación Escolar (PAE).',
    eligibleGrades: ALL_GRADES,
    color: '#9333ea' // purple-600
  },
  {
    id: 'consejo_directivo',
    title: 'Representante al Consejo Directivo',
    shortTitle: 'Consejo Directivo',
    legalBasis: 'Decreto 1860 de 1994, Art. 21 literal c)',
    description: 'Voz y voto de la comunidad estudiantil en la máxima instancia directiva, académica y administrativa de la institución educativa.',
    eligibleGrades: ALL_GRADES,
    color: '#6b21a8' // purple-800
  },
  {
    id: 'representante_curso',
    title: 'Representante de Curso al Consejo de Estudiantes',
    shortTitle: 'Representante de Curso',
    legalBasis: 'Decreto 1860 de 1994, Art. 29 - Consejo de Estudiantes',
    description: 'Vocero y líder de curso/taller elegido democráticamente para representar las iniciativas, convivencia y propuestas de su grupo ante el Consejo Estudiantil.',
    eligibleGrades: ALL_GRADES,
    color: '#581c87' // purple-900
  }
];

export const INITIAL_CANDIDATES: Candidate[] = [
  // Personería
  {
    id: 'cand-per-01',
    number: '01',
    positionId: 'personeria',
    fullName: 'Mariana Gómez & Nicolás Echeverry',
    principalName: 'Mariana Gómez Restrepo',
    principalGrade: '11°',
    principalGroup: '11-A',
    principalPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
    suplenteName: 'Nicolás Echeverry Gómez',
    suplenteGrade: '11°',
    suplenteGroup: '11-A',
    suplentePhotoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=320&q=80',
    grade: '11°',
    group: '11-A',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
    slogan: 'Liderazgo que defiende tus derechos y transforma nuestra convivencia.',
    proposals: [
      'Mesas de diálogo mensual con coordinación para revisión justa de sanciones formativas.',
      'Jornadas de salud mental, manejo del estrés y primeros auxilios psicológicos.',
      'Torneo intercolegiado de debate, oratoria y derechos humanos estudiantiles.'
    ],
    colorHex: '#7e22ce'
  },
  {
    id: 'cand-per-02',
    number: '02',
    positionId: 'personeria',
    fullName: 'Santiago Valderrama & Camila Ospina',
    principalName: 'Santiago Valderrama Pardo',
    principalGrade: '11°',
    principalGroup: '11-B',
    principalPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=320&q=80',
    suplenteName: 'Camila Andrea Ospina',
    suplenteGrade: '11°',
    suplenteGroup: '11-B',
    suplentePhotoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=320&q=80',
    grade: '11°',
    group: '11-B',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=320&q=80',
    slogan: 'Innovación pedagógica, deporte inclusivo y espacios verdes dignos.',
    proposals: [
      'Modernización de la sala de cómputo y acceso libre a biblioteca digital.',
      'Semana cultural con muestras artísticas, música colombiana y robótica escolar.',
      'Adecuación de puntos de reciclaje y siembra comunitaria en patios y zonas comunes.'
    ],
    colorHex: '#a855f7'
  },
  {
    id: 'cand-per-blanco',
    number: '99',
    positionId: 'personeria',
    fullName: 'Voto en Blanco',
    principalName: 'Voto en Blanco',
    principalGrade: '-',
    principalGroup: '-',
    principalPhotoUrl: '',
    suplenteName: '',
    suplenteGrade: '-',
    suplenteGroup: '-',
    suplentePhotoUrl: '',
    grade: '-',
    group: '-',
    photoUrl: '',
    slogan: 'Opción institucional de disconformidad legítima conforme a la jurisprudencia colombiana.',
    proposals: [
      'Opción protegida por la Constitución Política de Colombia.',
      'Si obtiene la mayoría absoluta, se deberá repetir la elección con nuevos candidatos.'
    ],
    colorHex: '#64748b',
    isBlankVote: true
  },

  // Contraloría
  {
    id: 'cand-con-01',
    number: '01',
    positionId: 'contraloria',
    fullName: 'Valeria Morales & Mateo Torres',
    principalName: 'Valeria Morales Quintero',
    principalGrade: '10°',
    principalGroup: '10-A',
    principalPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
    suplenteName: 'Mateo Alejandro Torres',
    suplenteGrade: '10°',
    suplenteGroup: '10-A',
    suplentePhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
    grade: '10°',
    group: '10-A',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
    slogan: 'Cuentas claras, restaurante escolar de calidad y dotación oportuna.',
    proposals: [
      'Comité veedor del refrigerio y almuerzo escolar (PAE) con verificación de peso y frescura.',
      'Publicación bimensual en mural institucional de los gastos de mantenimiento y papelería.',
      'Buzón de sugerencias e incidencias físicas en aulas y laboratorios de ciencias.'
    ],
    colorHex: '#6b21a8'
  },
  {
    id: 'cand-con-02',
    number: '02',
    positionId: 'contraloria',
    fullName: 'Juan Camilo Cárdenas & Isabella Gómez',
    principalName: 'Juan Camilo Cárdenas',
    principalGrade: '10°',
    principalGroup: '10-B',
    principalPhotoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=320&q=80',
    suplenteName: 'Isabella Gómez Barrientos',
    suplenteGrade: '10°',
    suplenteGroup: '10-B',
    suplentePhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
    grade: '10°',
    group: '10-B',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=320&q=80',
    slogan: 'Transparencia activa, presupuesto visible y cuidado del patrimonio.',
    proposals: [
      'Auditoría visual al inventario de instrumentos musicales y material deportivo.',
      'Campaña "Cuidar es ahorrar" para reducción de consumo energético y agua en baterías sanitarias.',
      'Informe trimestral digital transmitido por la emisora escolar.'
    ],
    colorHex: '#8b5cf6'
  },
  {
    id: 'cand-con-blanco',
    number: '99',
    positionId: 'contraloria',
    fullName: 'Voto en Blanco',
    principalName: 'Voto en Blanco',
    principalGrade: '-',
    principalGroup: '-',
    principalPhotoUrl: '',
    suplenteName: '',
    suplenteGrade: '-',
    suplenteGroup: '-',
    suplentePhotoUrl: '',
    grade: '-',
    group: '-',
    photoUrl: '',
    slogan: 'Opción institucional de disconformidad legítima conforme a la jurisprudencia colombiana.',
    proposals: [
      'Expresión democrática de desacuerdo con las candidaturas inscritas.',
      'Efectos jurídicos vinculantes para el Gobierno Escolar.'
    ],
    colorHex: '#64748b',
    isBlankVote: true
  },

  // Consejo Directivo
  {
    id: 'cand-dir-01',
    number: '01',
    positionId: 'consejo_directivo',
    fullName: 'David Alejandro Ruiz & Luciana Morales',
    principalName: 'David Alejandro Ruiz',
    principalGrade: '11°',
    principalGroup: '11-A',
    principalPhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
    suplenteName: 'Luciana Morales Reyes',
    suplenteGrade: '11°',
    suplenteGroup: '11-A',
    suplentePhotoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=320&q=80',
    grade: '11°',
    group: '11-A',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
    slogan: 'Representación con carácter, rigor y visión académica en el Consejo.',
    proposals: [
      'Gestión para ampliación de convenios con el SENA y universidades públicas.',
      'Defensa del calendario institucional sin perjuicio a los simulacros Saber 11°.',
      'Revisión transparente del manual tarifario de costos educativos y certificados.'
    ],
    colorHex: '#581c87'
  },
  {
    id: 'cand-dir-02',
    number: '02',
    positionId: 'consejo_directivo',
    fullName: 'Sofía Isabella Mendoza & Samuel Vargas',
    principalName: 'Sofía Isabella Mendoza',
    principalGrade: '11°',
    principalGroup: '11-B',
    principalPhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
    suplenteName: 'Samuel Esteban Vargas',
    suplenteGrade: '11°',
    suplenteGroup: '11-B',
    suplentePhotoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=320&q=80',
    grade: '11°',
    group: '11-B',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
    slogan: 'Equidad en decisiones directivas y fortalecimiento del bienestar integral.',
    proposals: [
      'Priorización presupuestal para dotación de implementos de primeros auxilios y enfermería.',
      'Apoyo institucional formal para delegaciones artísticas y deportivas del colegio.',
      'Canal directo de comunicación estudiantil previo a cada sesión ordinaria del Consejo.'
    ],
    colorHex: '#9333ea'
  },
  {
    id: 'cand-dir-blanco',
    number: '99',
    positionId: 'consejo_directivo',
    fullName: 'Voto en Blanco',
    principalName: 'Voto en Blanco',
    principalGrade: '-',
    principalGroup: '-',
    principalPhotoUrl: '',
    suplenteName: '',
    suplenteGrade: '-',
    suplenteGroup: '-',
    suplentePhotoUrl: '',
    grade: '-',
    group: '-',
    photoUrl: '',
    slogan: 'Opción institucional de disconformidad legítima conforme a la jurisprudencia colombiana.',
    proposals: [
      'Voto protegido y computable en el acta oficial de escrutinio E-14 y E-24.'
    ],
    colorHex: '#64748b',
    isBlankVote: true
  },

  // Representante de Curso (Consejo de Estudiantes por Grado/Puesto)
  // --- Casa de niños (Guardería / Preescolar: Pre-Jardín, Jardín, Transición) ---
  {
    id: 'cand-cur-pre-01',
    number: '01',
    positionId: 'representante_curso',
    fullName: 'Sofía Isabella Ángel Niño',
    grade: 'Transición',
    group: 'Casa de Niños A',
    photoUrl: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=320&q=80',
    slogan: 'Juegos alegres, compartir y cuidar nuestros juguetes.',
    proposals: [
      'Más tiempo de lectura con títeres y cuentos en el rincón mágico.',
      'Campaña de ayuda mutua para ordenar los materiales de trabajo.'
    ],
    colorHex: '#7e22ce'
  },
  {
    id: 'cand-cur-pre-02',
    number: '02',
    positionId: 'representante_curso',
    fullName: 'Lucas Mateo Navarro Gómez',
    grade: 'Jardín',
    group: 'Casa de Niños B',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=320&q=80',
    slogan: 'Amor por la naturaleza, las plantas y los animalitos.',
    proposals: [
      'Cuidar el jardín de flores y huerta pequeña de preescolar.',
      'Día de disfraces y juegos sensoriales al aire libre.'
    ],
    colorHex: '#9333ea'
  },
  {
    id: 'cand-cur-pre-03',
    number: '03',
    positionId: 'representante_curso',
    fullName: 'Martina Lucía Ruiz',
    grade: 'Pre-Jardín',
    group: 'Casa de Niños C',
    photoUrl: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=320&q=80',
    slogan: 'Sonrisas, amistad y diversión todos los días.',
    proposals: [
      'Rincón de plastilina y pinturas de colores en el patio.',
      'Canciones y música para empezar la mañana felices.'
    ],
    colorHex: '#6b21a8'
  },

  // --- Taller 1 (Primaria: Grados 1°, 2°, 3°) ---
  {
    id: 'cand-cur-01-01',
    number: '01',
    positionId: 'representante_curso',
    fullName: 'Emiliano José Cárdenas',
    grade: '1°',
    group: '1-A',
    photoUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=320&q=80',
    slogan: 'Primeros pasos con entusiasmo, lectura y compañerismo.',
    proposals: [
      'Tardes de exploración de cuentos y fábulas ilustradas.',
      'Cuidado y marcación de loncheras y útiles escolares.'
    ],
    colorHex: '#7e22ce'
  },
  {
    id: 'cand-cur-01-02',
    number: '02',
    positionId: 'representante_curso',
    fullName: 'Elena Sofía Morales',
    grade: '1°',
    group: '1-B',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
    slogan: 'Amabilidad, respeto y alegría en el Taller 1.',
    proposals: [
      'Juegos cooperativos en los descansos.',
      'Patrulla ecológica del salón para apagar luces al salir.'
    ],
    colorHex: '#9333ea'
  },
  {
    id: 'cand-cur-02-01',
    number: '01',
    positionId: 'representante_curso',
    fullName: 'Joaquín Gabriel Serrano',
    grade: '2°',
    group: '2-A',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=320&q=80',
    slogan: 'Aprender jugando con respeto y curiosidad científica.',
    proposals: [
      'Experimentos sencillos y ferias de ciencias en el salón.',
      'Club de ajedrez y rompecabezas para los recreos de lluvia.'
    ],
    colorHex: '#6b21a8'
  },
  {
    id: 'cand-cur-02-02',
    number: '02',
    positionId: 'representante_curso',
    fullName: 'Valeria Beltrán Paz',
    grade: '2°',
    group: '2-B',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=320&q=80',
    slogan: 'Solidaridad y manos amigas entre compañeros.',
    proposals: [
      'Campaña de apadrinamiento para repasar lectura comprensiva.',
      'Buzón de mensajes positivos y cumpleaños del mes.'
    ],
    colorHex: '#8b5cf6'
  },
  {
    id: 'cand-cur-03-01',
    number: '01',
    positionId: 'representante_curso',
    fullName: 'Mateo Alejandro Forero',
    grade: '3°',
    group: '3-A',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=320&q=80',
    slogan: 'Creatividad, dibujo y trabajo en equipo para 3°.',
    proposals: [
      'Mural escolar con dibujos y proyectos de Taller 1.',
      'Intercambio de libros favoritos entre salones de primaria.'
    ],
    colorHex: '#581c87'
  },
  {
    id: 'cand-cur-03-02',
    number: '02',
    positionId: 'representante_curso',
    fullName: 'Luciana Vélez Restrepo',
    grade: '3°',
    group: '3-B',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
    slogan: 'Liderazgo positivo y convivencia pacífica en el patio.',
    proposals: [
      'Mediadores infantiles para ayudar a resolver desacuerdos en el juego.',
      'Día del deporte y rondas tradicionales colombianas.'
    ],
    colorHex: '#7e22ce'
  },

  // --- Taller 2 (Primaria: Grados 4° y 5°) ---
  {
    id: 'cand-cur-04-01',
    number: '01',
    positionId: 'representante_curso',
    fullName: 'Santiago David Peñaloza',
    grade: '4°',
    group: '4-A',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
    slogan: 'Pensamiento crítico y amor por la ciencia en Taller 2.',
    proposals: [
      'Olimpiadas de retos matemáticos y acertijos interactivos.',
      'Brigada verde para el cuidado de la huerta y reciclaje de papel.'
    ],
    colorHex: '#6b21a8'
  },
  {
    id: 'cand-cur-04-02',
    number: '02',
    positionId: 'representante_curso',
    fullName: 'Antonia Silva Cifuentes',
    grade: '4°',
    group: '4-B',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
    slogan: 'Respeto a las diferencias y apoyo en tareas escolares.',
    proposals: [
      'Grupos de estudio guiados antes de las evaluaciones bimestrales.',
      'Rincón de talentos musicales y de oratoria escolar.'
    ],
    colorHex: '#9333ea'
  },
  {
    id: 'cand-cur-05-01',
    number: '01',
    positionId: 'representante_curso',
    fullName: 'Daniel Esteban Monroy',
    grade: '5°',
    group: '5-A',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=320&q=80',
    slogan: 'Liderazgo de 5° para una transición exitosa a bachillerato.',
    proposals: [
      'Charlas y recorridos con bachillerato para conocer Taller 3.',
      'Torneo de fútbol y baloncesto mixto de primaria superior.'
    ],
    colorHex: '#7e22ce'
  },
  {
    id: 'cand-cur-05-02',
    number: '02',
    positionId: 'representante_curso',
    fullName: 'Salomé Carrillo Duarte',
    grade: '5°',
    group: '5-B',
    photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=320&q=80',
    slogan: 'Voces unidas con autonomía y responsabilidad en Ekirayá.',
    proposals: [
      'Periódico digital mensual de Taller 2 con noticias de los cursos.',
      'Campaña de cero desperdicio de alimentos en el comedor escolar.'
    ],
    colorHex: '#8b5cf6'
  },

  // --- Taller 3, 4 y 5 (Bachillerato) ---
  {
    id: 'cand-cur-06-01',
    number: '01',
    positionId: 'representante_curso',
    fullName: 'Samuel David Bernal Gómez',
    grade: '6°',
    group: '6-A',
    photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=320&q=80',
    slogan: 'Unión, compañerismo y respeto en nuestras clases.',
    proposals: [
      'Organización de grupos de estudio y refuerzo en matemáticas e inglés.',
      'Campaña de cuidado de pupitres, casilleros y zonas de descanso.'
    ],
    colorHex: '#7e22ce'
  },
  {
    id: 'cand-cur-06-02',
    number: '02',
    positionId: 'representante_curso',
    fullName: 'Mariana Lucía Caicedo',
    grade: '6°',
    group: '6-B',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=320&q=80',
    slogan: 'Voz activa para que todas nuestras opiniones cuenten.',
    proposals: [
      'Reuniones quincenales de salón para escuchar inquietudes con profesores.',
      'Día de juegos de mesa y convivencia en el descanso.'
    ],
    colorHex: '#9333ea'
  },
  {
    id: 'cand-cur-07-01',
    number: '01',
    positionId: 'representante_curso',
    fullName: 'Nicolás Ramos Varela',
    grade: '7°',
    group: '7-A',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
    slogan: 'Comunicación clara entre estudiantes y directores de grupo.',
    proposals: [
      'Canal de dudas académicas y calendario de evaluaciones visible.',
      'Iniciativa de reciclaje y separación en la fuente dentro del aula.'
    ],
    colorHex: '#6b21a8'
  },
  {
    id: 'cand-cur-07-02',
    number: '02',
    positionId: 'representante_curso',
    fullName: 'Sara Valentina Duque',
    grade: '7°',
    group: '7-B',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
    slogan: 'Creatividad, arte y convivencia sana en 7°.',
    proposals: [
      'Espacios para presentaciones artísticas y clubes de lectura.',
      'Mediación amigable para resolver conflictos entre compañeros.'
    ],
    colorHex: '#a855f7'
  },
  {
    id: 'cand-cur-08-01',
    number: '01',
    positionId: 'representante_curso',
    fullName: 'Tomás Alejandro Reyes',
    grade: '8°',
    group: '8-A',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=320&q=80',
    slogan: 'Deporte, integración y excelencia académica.',
    proposals: [
      'Torneo relámpago intercursos de microfútbol y voleibol.',
      'Talleres de técnicas de estudio y preparación de proyectos.'
    ],
    colorHex: '#7e22ce'
  },
  {
    id: 'cand-cur-08-02',
    number: '02',
    positionId: 'representante_curso',
    fullName: 'Gabriela Solano Ortiz',
    grade: '8°',
    group: '8-B',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
    slogan: 'Cuidado mutuo, inclusión y respeto en el colegio.',
    proposals: [
      'Campañas de prevención del ciberacoso y bienestar escolar.',
      'Buzón confidencial de sugerencias del salón.'
    ],
    colorHex: '#8b5cf6'
  },
  {
    id: 'cand-cur-09-01',
    number: '01',
    positionId: 'representante_curso',
    fullName: 'Martín Emilio Quintero',
    grade: '9°',
    group: '9-A',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=320&q=80',
    slogan: 'Transición sólida hacia la media vocacional.',
    proposals: [
      'Charlas de orientación vocacional temprana y habilidades STEM.',
      'Revisión transparente de criterios de evaluación con docentes.'
    ],
    colorHex: '#6b21a8'
  },
  {
    id: 'cand-cur-09-02',
    number: '02',
    positionId: 'representante_curso',
    fullName: 'Laura Catalina Mejía',
    grade: '9°',
    group: '9-B',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=320&q=80',
    slogan: 'Compromiso ecológico y liderazgo juvenil participativo.',
    proposals: [
      'Proyecto de huerta escolar y aprovechamiento orgánico en Ekirayá.',
      'Comité de acompañamiento pedagógico entre pares.'
    ],
    colorHex: '#9333ea'
  },
  {
    id: 'cand-cur-10-01',
    number: '01',
    positionId: 'representante_curso',
    fullName: 'Juan Pablo Echeverri',
    grade: '10°',
    group: '10-A',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
    slogan: 'Preparación pre-Saber, debate y disciplina con sentido.',
    proposals: [
      'Banco compartido de preguntas tipo ICFES y simulacros.',
      'Representación activa de las necesidades de laboratorios y tecnología.'
    ],
    colorHex: '#581c87'
  },
  {
    id: 'cand-cur-10-02',
    number: '02',
    positionId: 'representante_curso',
    fullName: 'Valentina Cardona Ríos',
    grade: '10°',
    group: '10-B',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
    slogan: 'Liderazgo colaborativo y balance académico-emocional.',
    proposals: [
      'Gestión de jornadas de descanso activo y pausas pedagógicas.',
      'Integración cultural de décimo con proyectos intercolegiados.'
    ],
    colorHex: '#7e22ce'
  },
  {
    id: 'cand-cur-11-01',
    number: '01',
    positionId: 'representante_curso',
    fullName: 'Felipe Andrés Jaramillo',
    grade: '11°',
    group: '11-A',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=320&q=80',
    slogan: 'Un último año inolvidable con excelencia y compañerismo.',
    proposals: [
      'Coordinación de la despedida de grado 11 y feria universitaria.',
      'Mesas de diálogo con directivas para salidas pedagógicas de promoción.'
    ],
    colorHex: '#6b21a8'
  },
  {
    id: 'cand-cur-11-02',
    number: '02',
    positionId: 'representante_curso',
    fullName: 'Manuela Gómez Toro',
    grade: '11°',
    group: '11-B',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
    slogan: 'Legado de liderazgo responsable y apoyo a todos los grados.',
    proposals: [
      'Tutorías de 11° para los grados menores en bachillerato.',
      'Gestión de fondos y recuerdos institucionales de la promoción 2026.'
    ],
    colorHex: '#9333ea'
  },
  {
    id: 'cand-cur-blanco',
    number: '99',
    positionId: 'representante_curso',
    fullName: 'Voto en Blanco',
    grade: '-',
    group: '-',
    photoUrl: '',
    slogan: 'Opción institucional de disconformidad legítima conforme a la jurisprudencia colombiana.',
    proposals: [
      'Voto protegido y computable en el acta oficial de escrutinio E-14 y E-24.'
    ],
    colorHex: '#64748b',
    isBlankVote: true
  }
];

export const INITIAL_STUDENTS: Student[] = [
  // --- PUESTO 1: Casa de niños (Guarderia) - Mesas 1, 2, 3 ---
  // Mesa 1: Pre-Jardín
  {
    id: 'est-001',
    documentType: 'RC',
    documentNumber: '1193456001',
    fullName: 'Martina Lucía Ruiz González',
    grade: 'Pre-Jardín',
    group: 'Casa de Niños C',
    mesaNumber: 1,
    email: 'martina.ruiz@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T08:10:15.000Z',
    receiptFolio: 'CE-20260917-M01-11A9C2',
    isVerifiedByJurado: true
  },
  {
    id: 'est-002',
    documentType: 'RC',
    documentNumber: '1193456002',
    fullName: 'Joaquín Emilio Silva Rivas',
    grade: 'Pre-Jardín',
    group: 'Casa de Niños C',
    mesaNumber: 1,
    email: 'joaquin.silva@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  },
  // Mesa 2: Jardín
  {
    id: 'est-003',
    documentType: 'RC',
    documentNumber: '1183456003',
    fullName: 'Lucas Mateo Navarro Gómez',
    grade: 'Jardín',
    group: 'Casa de Niños B',
    mesaNumber: 2,
    email: 'lucas.navarro@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T08:22:40.000Z',
    receiptFolio: 'CE-20260917-M02-22B8E4',
    isVerifiedByJurado: true
  },
  {
    id: 'est-004',
    documentType: 'RC',
    documentNumber: '1183456004',
    fullName: 'Antonella María Cárdenas',
    grade: 'Jardín',
    group: 'Casa de Niños B',
    mesaNumber: 2,
    email: 'antonella.cardenas@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: false
  },
  // Mesa 3: Transición
  {
    id: 'est-005',
    documentType: 'RC',
    documentNumber: '1173456005',
    fullName: 'Sofía Isabella Ángel Niño',
    grade: 'Transición',
    group: 'Casa de Niños A',
    mesaNumber: 3,
    email: 'sofia.angel@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T08:35:10.000Z',
    receiptFolio: 'CE-20260917-M03-33C7D1',
    isVerifiedByJurado: true
  },
  {
    id: 'est-006',
    documentType: 'RC',
    documentNumber: '1173456006',
    fullName: 'Jerónimo David Castro Ortiz',
    grade: 'Transición',
    group: 'Casa de Niños A',
    mesaNumber: 3,
    email: 'jeronimo.castro@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  },

  // --- PUESTO 2: Taller 1 (Primaria) - Mesas 4, 5, 6, 7 ---
  // Mesa 4: Grado 1° A
  {
    id: 'est-007',
    documentType: 'RC',
    documentNumber: '1163456007',
    fullName: 'Emiliano José Cárdenas Melo',
    grade: '1°',
    group: '1-A',
    mesaNumber: 4,
    email: 'emiliano.cardenas@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T08:44:12.000Z',
    receiptFolio: 'CE-20260917-M04-44D6F9',
    isVerifiedByJurado: true
  },
  {
    id: 'est-008',
    documentType: 'RC',
    documentNumber: '1163456008',
    fullName: 'Mariana Duarte Rincón',
    grade: '1°',
    group: '1-A',
    mesaNumber: 4,
    email: 'mariana.duarte@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  },
  // Mesa 5: Grado 1° B
  {
    id: 'est-009',
    documentType: 'RC',
    documentNumber: '1163456009',
    fullName: 'Elena Sofía Morales Prieto',
    grade: '1°',
    group: '1-B',
    mesaNumber: 5,
    email: 'elena.morales@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: false
  },
  {
    id: 'est-010',
    documentType: 'RC',
    documentNumber: '1163456010',
    fullName: 'Santiago Nicolás León',
    grade: '1°',
    group: '1-B',
    mesaNumber: 5,
    email: 'santiago.leon@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T08:52:19.000Z',
    receiptFolio: 'CE-20260917-M05-55E5A8',
    isVerifiedByJurado: true
  },
  // Mesa 6: Grado 2°
  {
    id: 'est-011',
    documentType: 'RC',
    documentNumber: '1153456011',
    fullName: 'Joaquín Gabriel Serrano Vega',
    grade: '2°',
    group: '2-A',
    mesaNumber: 6,
    email: 'joaquin.serrano@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T09:01:05.000Z',
    receiptFolio: 'CE-20260917-M06-66F4B7',
    isVerifiedByJurado: true
  },
  {
    id: 'est-012',
    documentType: 'RC',
    documentNumber: '1153456012',
    fullName: 'Valeria Beltrán Paz',
    grade: '2°',
    group: '2-B',
    mesaNumber: 6,
    email: 'valeria.beltran@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  },
  // Mesa 7: Grado 3°
  {
    id: 'est-013',
    documentType: 'TI',
    documentNumber: '1143456013',
    fullName: 'Mateo Alejandro Forero Peña',
    grade: '3°',
    group: '3-A',
    mesaNumber: 7,
    email: 'mateo.forero@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T09:08:44.000Z',
    receiptFolio: 'CE-20260917-M07-77A3C6',
    isVerifiedByJurado: true
  },
  {
    id: 'est-014',
    documentType: 'TI',
    documentNumber: '1143456014',
    fullName: 'Luciana Vélez Restrepo',
    grade: '3°',
    group: '3-B',
    mesaNumber: 7,
    email: 'luciana.velez@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: false
  },

  // --- PUESTO 3: Taller 2 (Primaria) - Mesas 8, 9, 10, 11 ---
  // Mesa 8: Grado 4° A
  {
    id: 'est-015',
    documentType: 'TI',
    documentNumber: '1133456015',
    fullName: 'Santiago David Peñaloza Rúa',
    grade: '4°',
    group: '4-A',
    mesaNumber: 8,
    email: 'santiago.penaloza@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T09:14:30.000Z',
    receiptFolio: 'CE-20260917-M08-88B2D5',
    isVerifiedByJurado: true
  },
  {
    id: 'est-016',
    documentType: 'TI',
    documentNumber: '1133456016',
    fullName: 'Sara Valentina Moncada',
    grade: '4°',
    group: '4-A',
    mesaNumber: 8,
    email: 'sara.moncada@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  },
  // Mesa 9: Grado 4° B
  {
    id: 'est-017',
    documentType: 'TI',
    documentNumber: '1133456017',
    fullName: 'Antonia Silva Cifuentes',
    grade: '4°',
    group: '4-B',
    mesaNumber: 9,
    email: 'antonia.silva@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: false
  },
  {
    id: 'est-018',
    documentType: 'TI',
    documentNumber: '1133456018',
    fullName: 'Nicolás Javier Otero',
    grade: '4°',
    group: '4-B',
    mesaNumber: 9,
    email: 'nicolas.otero@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T09:19:55.000Z',
    receiptFolio: 'CE-20260917-M09-99C1E4',
    isVerifiedByJurado: true
  },
  // Mesa 10: Grado 5° A
  {
    id: 'est-019',
    documentType: 'TI',
    documentNumber: '1123456019',
    fullName: 'Daniel Esteban Monroy Barreto',
    grade: '5°',
    group: '5-A',
    mesaNumber: 10,
    email: 'daniel.monroy@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T09:25:40.000Z',
    receiptFolio: 'CE-20260917-M10-00D9F3',
    isVerifiedByJurado: true
  },
  {
    id: 'est-020',
    documentType: 'TI',
    documentNumber: '1123456020',
    fullName: 'Manuela Sofía Pineda',
    grade: '5°',
    group: '5-A',
    mesaNumber: 10,
    email: 'manuela.pineda@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  },
  // Mesa 11: Grado 5° B
  {
    id: 'est-021',
    documentType: 'TI',
    documentNumber: '1123456021',
    fullName: 'Salomé Carrillo Duarte',
    grade: '5°',
    group: '5-B',
    mesaNumber: 11,
    email: 'salome.carrillo@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  },
  {
    id: 'est-022',
    documentType: 'TI',
    documentNumber: '1123456022',
    fullName: 'Juan José Arbeláez',
    grade: '5°',
    group: '5-B',
    mesaNumber: 11,
    email: 'juan.arbelaez@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T09:31:18.000Z',
    receiptFolio: 'CE-20260917-M11-11E8A2',
    isVerifiedByJurado: true
  },

  // --- PUESTO 4: Taller 3 (Bachillerato medio) - Mesas 12, 13, 14 ---
  // Mesa 12: Grado 6° A
  {
    id: 'est-023',
    documentType: 'TI',
    documentNumber: '1023456781',
    fullName: 'Andrés Felipe Martínez Roa',
    grade: '6°',
    group: '6-A',
    mesaNumber: 12,
    email: 'andres.martinez@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T08:15:22.000Z',
    receiptFolio: 'CE-20260917-M12-9F2A14',
    isVerifiedByJurado: true
  },
  {
    id: 'est-024',
    documentType: 'TI',
    documentNumber: '1023456782',
    fullName: 'Camila Andrea Ospina Vargas',
    grade: '6°',
    group: '6-A',
    mesaNumber: 12,
    email: 'camila.ospina@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  },
  // Mesa 13: Grado 6° B
  {
    id: 'est-025',
    documentType: 'TI',
    documentNumber: '1023456783',
    fullName: 'Samuel David Bernal Gómez',
    grade: '6°',
    group: '6-B',
    mesaNumber: 13,
    email: 'samuel.bernal@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T08:24:10.000Z',
    receiptFolio: 'CE-20260917-M13-4B1C88',
    isVerifiedByJurado: true
  },
  {
    id: 'est-026',
    documentType: 'TI',
    documentNumber: '1023456784',
    fullName: 'Mariana Lucía Caicedo',
    grade: '6°',
    group: '6-B',
    mesaNumber: 13,
    email: 'mariana.caicedo@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: false
  },
  // Mesa 14: Grado 7° A y B
  {
    id: 'est-027',
    documentType: 'TI',
    documentNumber: '1023456785',
    fullName: 'Nicolás Ramos Varela',
    grade: '7°',
    group: '7-A',
    mesaNumber: 14,
    email: 'nicolas.ramos@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T08:31:40.000Z',
    receiptFolio: 'CE-20260917-M14-7A8B99',
    isVerifiedByJurado: true
  },
  {
    id: 'est-028',
    documentType: 'TI',
    documentNumber: '1023456786',
    fullName: 'Sara Valentina Duque',
    grade: '7°',
    group: '7-B',
    mesaNumber: 14,
    email: 'sara.duque@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  },

  // --- PUESTO 5: Taller 4 (Bachillerato medio) - Mesas 15, 16, 17 ---
  // Mesa 15: Grado 8° A
  {
    id: 'est-029',
    documentType: 'TI',
    documentNumber: '1012345671',
    fullName: 'Nicolás Eduardo Castro Díaz',
    grade: '8°',
    group: '8-A',
    mesaNumber: 15,
    email: 'nicolas.castro@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T08:42:05.000Z',
    receiptFolio: 'CE-20260917-M15-8D3E52',
    isVerifiedByJurado: true
  },
  {
    id: 'est-030',
    documentType: 'TI',
    documentNumber: '1012345672',
    fullName: 'Valentina Silva Ramírez',
    grade: '8°',
    group: '8-A',
    mesaNumber: 15,
    email: 'valentina.silva@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  },
  // Mesa 16: Grado 8° B y 9° A
  {
    id: 'est-031',
    documentType: 'TI',
    documentNumber: '1012345673',
    fullName: 'Samuel Esteban Parra León',
    grade: '8°',
    group: '8-B',
    mesaNumber: 16,
    email: 'samuel.parra@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T08:58:30.000Z',
    receiptFolio: 'CE-20260917-M16-1A7F90',
    isVerifiedByJurado: true
  },
  {
    id: 'est-032',
    documentType: 'CE',
    documentNumber: '951234882',
    fullName: 'Isabella Gabriela Contreras Hurtado',
    grade: '9°',
    group: '9-A',
    mesaNumber: 16,
    email: 'isabella.contreras@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: false
  },
  // Mesa 17: Grado 9° B
  {
    id: 'est-033',
    documentType: 'TI',
    documentNumber: '1012345674',
    fullName: 'Martín Emilio Quintero',
    grade: '9°',
    group: '9-B',
    mesaNumber: 17,
    email: 'martin.quintero@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T09:03:10.000Z',
    receiptFolio: 'CE-20260917-M17-2B8E01',
    isVerifiedByJurado: true
  },
  {
    id: 'est-034',
    documentType: 'TI',
    documentNumber: '1012345675',
    fullName: 'Laura Catalina Mejía',
    grade: '9°',
    group: '9-B',
    mesaNumber: 17,
    email: 'laura.mejia@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  },

  // --- PUESTO 6: Taller 5 (bachillerato alto) - Mesas 18, 19, 20 ---
  // Mesa 18: Grado 10° A
  {
    id: 'est-035',
    documentType: 'TI',
    documentNumber: '1001234567',
    fullName: 'Daniel Santiago Pinzón Garzón',
    grade: '10°',
    group: '10-A',
    mesaNumber: 18,
    email: 'daniel.pinzon@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T09:05:14.000Z',
    receiptFolio: 'CE-20260917-M18-3C4D11',
    isVerifiedByJurado: true
  },
  {
    id: 'est-036',
    documentType: 'TI',
    documentNumber: '1001234568',
    fullName: 'Gabriela Morales Rincón',
    grade: '10°',
    group: '10-A',
    mesaNumber: 18,
    email: 'gabriela.morales@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  },
  // Mesa 19: Grado 10° B y 11° A
  {
    id: 'est-037',
    documentType: 'TI',
    documentNumber: '1000112233',
    fullName: 'Julián David Moreno Castro',
    grade: '11°',
    group: '11-A',
    mesaNumber: 19,
    email: 'julian.moreno@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  },
  {
    id: 'est-038',
    documentType: 'TI',
    documentNumber: '1000112244',
    fullName: 'Paula Jimena Rojas Arango',
    grade: '11°',
    group: '11-A',
    mesaNumber: 19,
    email: 'paula.rojas@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: false
  },
  // Mesa 20: Grado 11° B
  {
    id: 'est-039',
    documentType: 'TI',
    documentNumber: '1000112255',
    fullName: 'Felipe Andrés Jaramillo',
    grade: '11°',
    group: '11-B',
    mesaNumber: 20,
    email: 'felipe.jaramillo@ekiraya.edu.co',
    hasVoted: true,
    votedAt: '2026-09-17T09:12:00.000Z',
    receiptFolio: 'CE-20260917-M20-5E6F77',
    isVerifiedByJurado: true
  },
  {
    id: 'est-040',
    documentType: 'TI',
    documentNumber: '1000112266',
    fullName: 'Manuela Gómez Toro',
    grade: '11°',
    group: '11-B',
    mesaNumber: 20,
    email: 'manuela.gomez@ekiraya.edu.co',
    hasVoted: false,
    isVerifiedByJurado: true
  }
];

export const INITIAL_CONFIG: ElectionConfig = {
  institutionName: 'Colegio Ekirayá - CEM',
  logoUrl: 'https://colegioekiraya.edu.co/wp-content/uploads/2024/09/LOGO-CEM-COLOR-02.png',
  daneCode: '311001859214',
  nit: '900.412.875-1',
  city: 'La Calera / Bogotá D.C.',
  department: 'Cundinamarca',
  academicYear: 2026,
  rectorName: 'Dra. Patricia Elena Montoya Gómez',
  personeroDocenteLider: 'Lic. Andrés Mauricio Galindo (Área de Ciencias Sociales y Bilingüismo)',
  status: 'ABIERTA',
  openedAt: '2026-09-17T08:00:00.000Z',
  totalMesas: 20,
  pollingStations: POLLING_STATIONS,
  googleSheets: {
    enabled: true,
    scriptUrl: 'https://script.google.com/macros/s/AKfycbzK2vgE7BiggCHsWkttEg8_iGEDYNCT1jVYpJvyLgFoNqYz15yhc0Deq0FLOMNeQnv0/exec',
    sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    autoSync: true,
    lastSyncTime: '2026-09-17T09:12:00.000Z',
    status: 'idle'
  },
  supabase: {
    enabled: true,
    projectUrl: 'https://ekiraya-voto.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdG9la2lyYXlhIn0',
    tableName: 'voto_ekiraya_audit_vault',
    syncStatus: 'connected'
  },
  encryptionKeyFingerprint: 'SHA256:4a8b79f8e712a10b45920c8de15c32890fabc4231a',
  institutionEmail: 'rectoria@ekiraya.edu.co',
  superadminEmail: 'rectoria@ekiraya.edu.co'
};

export const INITIAL_JURADOS: JuradoMember[] = [
  {
    id: 'jur-01',
    mesaNumber: 1,
    fullName: 'Prof. Claudia Marcela Ríos',
    documentNumber: '52890123',
    role: 'PRESIDENTE_MESA',
    pin: 'jurado2026',
    email: 'claudia.rios@ekiraya.edu.co',
    status: 'ACTIVO',
    openedMesaAt: '2026-09-17T08:00:00.000Z'
  },
  {
    id: 'jur-02',
    mesaNumber: 2,
    fullName: 'Lic. Fernando José Barreto',
    documentNumber: '79450321',
    role: 'PRESIDENTE_MESA',
    pin: 'jurado2026',
    email: 'fernando.barreto@ekiraya.edu.co',
    status: 'ACTIVO',
    openedMesaAt: '2026-09-17T08:05:00.000Z'
  },
  {
    id: 'jur-03',
    mesaNumber: 3,
    fullName: 'Lic. Andrea Viviana Castro',
    documentNumber: '1018432190',
    role: 'PRESIDENTE_MESA',
    pin: 'jurado2026',
    email: 'andrea.castro@ekiraya.edu.co',
    status: 'ACTIVO',
    openedMesaAt: '2026-09-17T08:02:00.000Z'
  }
];

export const INITIAL_ADMINS: AdminMember[] = [
  {
    id: 'adm-01',
    fullName: 'Dra. Patricia Elena Montoya Gómez',
    documentNumber: '41982301',
    username: 'rectoria',
    role: 'SUPER_ADMIN',
    pin: 'admin2026',
    email: 'rectoria@ekiraya.edu.co',
    status: 'ACTIVO',
    lastAccessAt: '2026-09-17T07:45:00.000Z'
  },
  {
    id: 'adm-02',
    fullName: 'Lic. Andrés Mauricio Galindo',
    documentNumber: '80123456',
    username: 'lider.ciencias',
    role: 'REGISTRADOR',
    pin: 'admin2026',
    email: 'andres.galindo@ekiraya.edu.co',
    status: 'ACTIVO',
    lastAccessAt: '2026-09-17T07:50:00.000Z'
  },
  {
    id: 'adm-03',
    fullName: 'Ing. Mateo Bolaños',
    documentNumber: '1020304050',
    username: 'auditor.sistemas',
    role: 'AUDITOR',
    pin: 'admin2026',
    email: 'mebolanos@cem.edu.co',
    status: 'ACTIVO',
    lastAccessAt: '2026-09-17T08:10:00.000Z'
  }
];
