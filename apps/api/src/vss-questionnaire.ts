/** Moodly's own wording. Edit here and increment VERSION when questions change. */
export const VSS_VERSION = 1;
export const vssQuestions = [
  { id: 'position', title: 'Tu souhaites parler d’une situation…', help: 'Tu peux signaler une situation vécue ou observée, même sans savoir comment la qualifier.', type: 'single', required: true, options: [{ value: 'SELF', label: 'Que je vis ou que j’ai vécue' }, { value: 'WITNESS', label: 'Dont je suis témoin' }, { value: 'OTHER', label: 'Qui m’a été rapportée' }, { value: 'UNSURE', label: 'Je préfère ne pas préciser' }] },
  { id: 'concerns', title: 'Qu’est-ce qui t’amène à nous en parler ?', help: 'Plusieurs réponses sont possibles. Ces mots servent à t’écouter, pas à établir une qualification juridique.', type: 'multiple', required: true, options: [{ value: 'SEXIST', label: 'Propos ou comportements sexistes' }, { value: 'SEXUAL', label: 'Propos, messages ou gestes à caractère sexuel' }, { value: 'PRESSURE', label: 'Pressions, menaces ou demandes non souhaitées' }, { value: 'HARASSMENT', label: 'Humiliations, mise à l’écart ou comportements répétés' }, { value: 'OTHER', label: 'Une autre situation qui me préoccupe' }, { value: 'UNSURE', label: 'Je ne sais pas comment la décrire' }] },
  { id: 'ongoing', title: 'Cette situation est-elle encore en cours ?', type: 'single', required: true, options: [{ value: 'YES', label: 'Oui' }, { value: 'NO', label: 'Non' }, { value: 'UNSURE', label: 'Je ne sais pas / je préfère ne pas préciser' }] },
  { id: 'context', title: 'Dans quel contexte cela s’est-il passé ?', type: 'single', required: false, options: [{ value: 'WORKPLACE', label: 'Sur le lieu de travail' }, { value: 'ONLINE', label: 'En ligne, par message ou à distance' }, { value: 'EVENT', label: 'Pendant un déplacement ou un événement professionnel' }, { value: 'OTHER', label: 'Dans un autre contexte' }, { value: 'UNSURE', label: 'Je préfère ne pas préciser' }] },
  { id: 'period', title: 'Quand cela s’est-il passé ?', help: 'Une période approximative suffit. Tu peux laisser ce champ vide.', type: 'text', required: false, maxLength: 200 },
  { id: 'description', title: 'Que souhaites-tu nous partager ?', help: 'Raconte seulement ce que tu te sens prêt à partager. N’ajoute pas de coordonnées ou de détails concernant d’autres personnes qui ne sont pas utiles à ta démarche.', type: 'textarea', required: false, maxLength: 4000 },
  { id: 'needs', title: 'De quoi aurais-tu besoin maintenant ?', type: 'multiple', required: true, options: [{ value: 'LISTEN', label: 'Être écouté et orienté' }, { value: 'INFORMATION', label: 'Comprendre les suites possibles' }, { value: 'ACTION', label: 'Que la situation soit examinée' }, { value: 'UNSURE', label: 'Je ne sais pas encore' }] },
] as const;

import { z } from 'zod';
const answerShape: z.ZodRawShape = {};
for (const question of vssQuestions) {
  if ('options' in question) {
    const choice = z.enum(question.options.map(o => o.value) as [string, ...string[]]);
    answerShape[question.id] = question.type === 'multiple' ? z.array(choice).min(question.required ? 1 : 0).max(question.options.length).refine(values => new Set(values).size === values.length) : question.required ? choice : choice.optional();
  } else answerShape[question.id] = z.string().trim().max(question.maxLength).optional().default('');
}
export const vssSubmissionSchema = z.object({ version: z.literal(VSS_VERSION), submissionKey: z.string().uuid(), answers: z.object(answerShape).strict(), contactMode: z.enum(['ANONYMOUS', 'CONTACT']), contact: z.string().trim().max(250), consent: z.literal(true) }).strict().superRefine((data, context) => {
  if (data.contactMode === 'ANONYMOUS' && data.contact !== '') context.addIssue({ code: z.ZodIssueCode.custom, path: ['contact'], message: 'No contact allowed in anonymous mode' });
  if (data.contactMode === 'CONTACT' && data.contact.length < 3) context.addIssue({ code: z.ZodIssueCode.custom, path: ['contact'], message: 'Contact required' });
});
