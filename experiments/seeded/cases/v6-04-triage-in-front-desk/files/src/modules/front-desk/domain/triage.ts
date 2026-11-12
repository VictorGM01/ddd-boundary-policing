const URGENT_SYMPTOMS = ['chest pain', 'shortness of breath', 'fainting'];

export function triagePriority(symptoms: string[]): 'URGENT' | 'ROUTINE' {
  return symptoms.some((s) => URGENT_SYMPTOMS.includes(s.toLowerCase())) ? 'URGENT' : 'ROUTINE';
}
