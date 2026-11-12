# Linguagem Ubíqua

Glossário por contexto. Cada termo vale **somente dentro do seu contexto**. O identificador em código aparece entre crases.

## O ponto central: a Pessoa

A mesma pessoa física aparece nos quatro contextos, mas com um modelo diferente em cada um. Os contextos compartilham apenas o identificador `personId` (tipo `PersonId` do Shared Kernel). Nunca compartilham o modelo.

| Contexto | Papel da Pessoa | Em código | O que o contexto sabe sobre ela |
|---|---|---|---|
| Agendamento | Solicitante da consulta | `Requester` | nome e telefone de contato para a agenda |
| Recepção | Visitante | `Visitor` (implícito na `Visit`) | que é esperada num horário e se já chegou |
| Clínico | Paciente | `Patient` (`patientId` no `Encounter`) | anamnese, diagnósticos, procedimentos |
| Faturamento | Pagador | `Payer` (`payerId` na `Invoice`) | quanto deve e por quê |

Se um contexto passar a modelar a Pessoa com o papel de outro (por exemplo, uma classe `Patient` dentro de `billing`), isso é a violação V6 da [taxonomia](taxonomia.md). A análise estática não enxerga isso. Esse caso existe para medir falsos negativos e servir de alvo ao E2.

## Agendamento (`scheduling`)

| Termo | Código | Definição |
|---|---|---|
| Consulta | `Appointment` | Reserva de um horário de um profissional para um solicitante |
| Solicitante | `Requester` | Quem pediu a consulta (nome, telefone, `personId`) |
| Profissional | `practitionerId` | Médico dono da agenda. Neste protótipo é só um identificador |
| Horário | `startsAt`, `endsAt` | Intervalo reservado (duração padrão de 30 minutos) |
| Agendar | `schedule` | Criar uma consulta. Não pode ser no passado nem sobrepor outra consulta ativa do mesmo profissional |
| Cancelar | `cancel` | Liberar o horário. Só consultas agendadas |
| Não comparecimento | `markNoShow` | Registrar que o solicitante não veio. Só depois do início do horário |

## Recepção (`front-desk`)

| Termo | Código | Definição |
|---|---|---|
| Visita | `Visit` | Expectativa de que alguém compareça à clínica para uma consulta |
| Visitante | `Visitor` | Pessoa que chega à recepção. Identificada por `personId` |
| Visita esperada | `EXPECTED` | Estado inicial, criado a partir de `AppointmentScheduled` |
| Check-in | `checkIn` | Registrar a chegada. Não é possível em visita cancelada nem duas vezes |
| Fila de espera | `WaitingQueue` | Visitantes com check-in, em ordem de chegada |

## Clínico (`clinical`)

| Termo | Código | Definição |
|---|---|---|
| Atendimento | `Encounter` | Encontro clínico entre profissional e paciente |
| Paciente | `patientId` | Pessoa sob cuidado clínico |
| Aguardando | `WAITING` | Paciente chegou (traduzido de `VisitorCheckedIn`) |
| Iniciar | `start` | Profissional começa o atendimento |
| Anamnese | `notes` | Registro textual do atendimento |
| Diagnóstico | `diagnosisCodes` | Códigos de diagnóstico (CID). Não saem do contexto |
| Procedimento | `procedureCodes` | Códigos de procedimento realizados (vocabulário publicado) |
| Concluir | `complete` | Encerrar o atendimento. Exige ao menos um procedimento e atendimento iniciado |

## Faturamento (`billing`)

| Termo | Código | Definição |
|---|---|---|
| Fatura | `Invoice` | Cobrança emitida para um pagador |
| Pagador | `payerId` | Quem paga |
| Item | `InvoiceLine` | Linha da fatura: código, descrição, valor em centavos |
| Tabela de preços | `PriceList` | Preço de cada código de procedimento |
| Origem | `sourceType`, `sourceId` | O que originou a cobrança (atendimento ou não comparecimento). Uma origem gera no máximo uma fatura |
| Taxa de não comparecimento | `NO_SHOW_FEE` | Valor cobrado quando o solicitante falta |

## Termos que atravessam fronteiras (Published Language)

Só os termos abaixo, definidos em `src/contracts/`, circulam entre contextos:

| Evento | Publicador | Campos |
|---|---|---|
| `AppointmentScheduled` | Agendamento | `appointmentId`, `personId`, `practitionerId`, `startsAt`, `endsAt` |
| `AppointmentCancelled` | Agendamento | `appointmentId`, `personId`, `reason` |
| `AppointmentNoShow` | Agendamento | `appointmentId`, `personId`, `startsAt` |
| `VisitorCheckedIn` | Recepção | `visitId`, `appointmentId`, `personId`, `practitionerId`, `checkedInAt` |
| `EncounterCompleted` | Clínico | `encounterId`, `appointmentId`, `personId`, `procedureCodes`, `completedAt` |

Todos carregam também `eventId` e `occurredAt` (base `IntegrationEvent` do Shared Kernel).
