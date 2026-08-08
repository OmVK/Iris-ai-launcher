export function safeEvaluate(expression) {
  if (typeof expression !== 'string') return NaN
  const tokens = tokenize(expression)
  if (!tokens.length) return NaN
  const parser = new Parser(tokens)
  const value = parser.parseExpression()
  if (parser.peek() !== null) return NaN
  if (!Number.isFinite(value)) return NaN
  return value
}

function tokenize(expr) {
  const tokens = []
  let i = 0
  while (i < expr.length) {
    const ch = expr[i]
    if (ch === ' ' || ch === '\t') {
      i++
      continue
    }
    if (/[0-9.]/.test(ch)) {
      let num = ''
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i]
        i++
      }
      const value = Number(num)
      if (!Number.isFinite(value)) return []
      tokens.push({ type: 'num', value })
      continue
    }
    if ('+-*/()'.includes(ch)) {
      tokens.push({ type: ch, value: ch })
      i++
      continue
    }
    return []
  }
  return tokens
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens
    this.pos = 0
  }

  peek() {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null
  }

  consume() {
    const token = this.peek()
    this.pos++
    return token
  }

  match(type) {
    const token = this.peek()
    if (token && token.type === type) {
      this.pos++
      return token
    }
    return null
  }

  parseExpression() {
    return this.parseAddSub()
  }

  parseAddSub() {
    let left = this.parseMulDiv()
    for (;;) {
      const op = this.match('+')
      if (op) {
        left += this.parseMulDiv()
        continue
      }
      const sub = this.match('-')
      if (sub) {
        left -= this.parseMulDiv()
        continue
      }
      return left
    }
  }

  parseMulDiv() {
    let left = this.parseUnary()
    for (;;) {
      const mul = this.match('*')
      if (mul) {
        left *= this.parseUnary()
        continue
      }
      const div = this.match('/')
      if (div) {
        const right = this.parseUnary()
        if (right === 0) return NaN
        left /= right
        continue
      }
      return left
    }
  }

  parseUnary() {
    if (this.match('-')) return -this.parseUnary()
    if (this.match('+')) return this.parseUnary()
    return this.parsePrimary()
  }

  parsePrimary() {
    const token = this.peek()
    if (token && token.type === 'num') {
      this.pos++
      return token.value
    }
    if (this.match('(')) {
      const value = this.parseExpression()
      if (!this.match(')')) return NaN
      return value
    }
    return NaN
  }
}
