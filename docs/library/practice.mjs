import { readCorpusSample } from './corpus.mjs';

const exercises = [
  { title: '先讀辛年女盤', id: '1991-10-18T08:30:00+08:00/female', choices: ['丁酉', '己亥'], hint: '辛是陰干。戊戌的下一位是己亥，前一位是丁酉。' },
  { title: '換成同一時刻的男盤', id: '1991-10-18T08:30:00+08:00/male', choices: ['丁酉', '己亥'], hint: '這次是陰年男盤。回到相同的月柱，把取節方向倒過來。' },
  { title: '換張盤，自己試一次', id: '1932-02-06T08:30:00+08:00/male', choices: ['辛丑', '癸卯'], hint: '壬是陽干。先決定男盤的方向，再從月柱壬寅挪動一位。' },
];

function text(tag, value) {
  const node = document.createElement(tag);
  node.textContent = value;
  return node;
}
for (const [index, exercise] of exercises.entries()) {
  const { chart } = readCorpusSample(exercise.id);
  const luck = chart.daYun;
  const section = document.createElement('section');
  section.className = 'exercise';
  section.append(text('h2', exercise.title), text('p', exercise.id.slice(0, 10) + '　08:30　' + chart.fourPillars));
  const form = document.createElement('form');
  const fieldset = document.createElement('fieldset');
  fieldset.append(text('legend', '從月柱' + chart.pillars.month.ganZhi + '起，第一步大運是哪一柱？'));
  for (const choice of exercise.choices) {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio'; radio.name = 'answer-' + index; radio.value = choice; radio.required = true;
    label.append(radio, choice); fieldset.append(label);
  }
  const submit = text('button', '核對答案');
  submit.type = 'submit'; form.append(fieldset, submit);
  const feedback = document.createElement('p');
  feedback.className = 'feedback'; feedback.setAttribute('role', 'status');
  const link = text('a', '打開這張盤的 13 章');
  link.href = './#' + new URLSearchParams({ id: exercise.id, chapter: 'work' }); link.hidden = true;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const correct = new FormData(form).get('answer-' + index) === luck.cycles[0].ganZhi;
    if (correct) {
      const term = luck.timing.jieName === '惊蛰' ? '驚蟄' : luck.timing.jieName;
      feedback.textContent = '答對了。' + (luck.isForward ? '順行，取出生後的' : '逆行，取出生前的') + term +
        '。第一步是' + luck.cycles[0].ganZhi + '，起運於 ' + luck.startDate.slice(0, 16) + '（UTC+8）。';
    } else feedback.textContent = exercise.hint + ' 再選一次。';
    link.hidden = !correct;
  });
  section.append(form, feedback, link);
  document.getElementById('exercises').append(section);
}
