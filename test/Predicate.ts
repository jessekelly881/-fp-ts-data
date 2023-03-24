import { constFalse, constTrue, pipe } from "@effect/data/Function"
import * as _ from "@effect/data/Predicate"
import { deepStrictEqual } from "@effect/data/test/util"

const isPositive: _.Predicate<number> = (n) => n > 0
const isNegative: _.Predicate<number> = (n) => n < 0
const isLessThan2: _.Predicate<number> = (n) => n < 2
const isString: _.Refinement<unknown, string> = (u: unknown): u is string => typeof u === "string"

interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol
}

type NonEmptyString = string & NonEmptyStringBrand

const NonEmptyString: _.Refinement<string, NonEmptyString> = (s): s is NonEmptyString => s.length > 0

describe.concurrent("Predicate", () => {
  it("instances and derived exports", () => {
    expect(_.Invariant).exist
    expect(_.asTuple).exist
    expect(_.asProp).exist

    expect(_.Contravariant).exist
    expect(_.contramap).exist

    expect(_.ofStruct).exist
    expect(_.ofTuple).exist

    expect(_.SemiProduct).exist
    expect(_.appendElement).exist

    expect(_.Product).exist
    expect(_.tuple).exist
    expect(_.struct).exist
  })

  it("compose", () => {
    const refinement = pipe(isString, _.compose(NonEmptyString))
    deepStrictEqual(refinement("a"), true)
    deepStrictEqual(refinement(null), false)
    deepStrictEqual(refinement(""), false)
  })

  it("contramap", () => {
    type A = {
      readonly a: number
    }
    const predicate = pipe(
      isPositive,
      _.contramap((a: A) => a.a)
    )
    deepStrictEqual(predicate({ a: -1 }), false)
    deepStrictEqual(predicate({ a: 0 }), false)
    deepStrictEqual(predicate({ a: 1 }), true)
  })

  it("product", () => {
    const product = _.SemiProduct.product
    const p = product(isPositive, isNegative)
    deepStrictEqual(p([1, -1]), true)
    deepStrictEqual(p([1, 1]), false)
    deepStrictEqual(p([-1, -1]), false)
    deepStrictEqual(p([-1, 1]), false)
  })

  it("productMany", () => {
    const productMany = _.SemiProduct.productMany
    const p = productMany(isPositive, [isNegative])
    deepStrictEqual(p([1, -1]), true)
    deepStrictEqual(p([1, 1]), false)
    deepStrictEqual(p([-1, -1]), false)
    deepStrictEqual(p([-1, 1]), false)
  })

  it("productAll", () => {
    const p = _.Product.productAll([isPositive, isNegative])
    deepStrictEqual(p([1]), true)
    deepStrictEqual(p([1, -1]), true)
    deepStrictEqual(p([1, 1]), false)
    deepStrictEqual(p([-1, -1]), false)
    deepStrictEqual(p([-1, 1]), false)
  })

  it("not", () => {
    const p = _.not(isPositive)
    deepStrictEqual(p(1), false)
    deepStrictEqual(p(0), true)
    deepStrictEqual(p(-1), true)
  })

  it("or", () => {
    const p = pipe(isPositive, _.or(isNegative))
    deepStrictEqual(p(-1), true)
    deepStrictEqual(p(1), true)
    deepStrictEqual(p(0), false)
  })

  it("and", () => {
    const p = pipe(isPositive, _.and(isLessThan2))
    deepStrictEqual(p(1), true)
    deepStrictEqual(p(-1), false)
    deepStrictEqual(p(3), false)
  })

  it("xor", () => {
    expect(pipe(constTrue, _.xor(constTrue))(null)).toBeFalsy() // true xor true = false
    expect(pipe(constTrue, _.xor(constFalse))(null)).toBeTruthy() // true xor false = true
    expect(pipe(constFalse, _.xor(constTrue))(null)).toBeTruthy() // false xor true = true
    expect(pipe(constFalse, _.xor(constFalse))(null)).toBeFalsy() // false xor false = false
  })

  it("eqv", () => {
    expect(pipe(constTrue, _.eqv(constTrue))(null)).toBeTruthy() // true eqv true = true
    expect(pipe(constTrue, _.eqv(constFalse))(null)).toBeFalsy() // true eqv false = false
    expect(pipe(constFalse, _.eqv(constTrue))(null)).toBeFalsy() // false eqv true = false
    expect(pipe(constFalse, _.eqv(constFalse))(null)).toBeTruthy() // false eqv false = true
  })

  it("implies", () => {
    expect(pipe(constTrue, _.implies(constTrue))(null)).toBeTruthy() // true implies true = true
    expect(pipe(constTrue, _.implies(constFalse))(null)).toBeFalsy() // true implies false = false
    expect(pipe(constFalse, _.implies(constTrue))(null)).toBeTruthy() // false implies true = true
    expect(pipe(constFalse, _.implies(constFalse))(null)).toBeTruthy() // false implies false = true
  })

  it("nor", () => {
    expect(pipe(constTrue, _.nor(constTrue))(null)).toBeFalsy() // true nor true = false
    expect(pipe(constTrue, _.nor(constFalse))(null)).toBeFalsy() // true nor false = false
    expect(pipe(constFalse, _.nor(constTrue))(null)).toBeFalsy() // false nor true = false
    expect(pipe(constFalse, _.nor(constFalse))(null)).toBeTruthy() // false nor false = true
  })

  it("nand", () => {
    expect(pipe(constTrue, _.nand(constTrue))(null)).toBeFalsy() // true nand true = false
    expect(pipe(constTrue, _.nand(constFalse))(null)).toBeTruthy() // true nand false = true
    expect(pipe(constFalse, _.nand(constTrue))(null)).toBeTruthy() // false nand true = true
    expect(pipe(constFalse, _.nand(constFalse))(null)).toBeTruthy() // false nand false = true
  })

  it("getSemigroupSome", () => {
    const S = _.getSemigroupSome<number>()
    const p1 = S.combine(isPositive, isNegative)
    deepStrictEqual(p1(0), false)
    deepStrictEqual(p1(-1), true)
    deepStrictEqual(p1(1), true)
    const p2 = S.combineMany(isPositive, [isNegative])
    deepStrictEqual(p2(0), false)
    deepStrictEqual(p2(-1), true)
    deepStrictEqual(p2(1), true)
  })

  it("getMonoidSome", () => {
    const M = _.getMonoidSome<number>()
    const predicate = M.combine(isPositive, M.empty)
    deepStrictEqual(predicate(0), isPositive(0))
    deepStrictEqual(predicate(-1), isPositive(-1))
    deepStrictEqual(predicate(1), isPositive(1))
  })

  it("getSemigroupEvery", () => {
    const S = _.getSemigroupEvery<number>()
    const p1 = S.combine(isPositive, isLessThan2)
    deepStrictEqual(p1(0), false)
    deepStrictEqual(p1(-2), false)
    deepStrictEqual(p1(1), true)
    const p2 = S.combineMany(isPositive, [isLessThan2])
    deepStrictEqual(p2(0), false)
    deepStrictEqual(p2(-2), false)
    deepStrictEqual(p2(1), true)
  })

  it("getMonoidEvery", () => {
    const M = _.getMonoidEvery<number>()
    const predicate = M.combine(isPositive, M.empty)
    deepStrictEqual(predicate(0), isPositive(0))
    deepStrictEqual(predicate(-1), isPositive(-1))
    deepStrictEqual(predicate(1), isPositive(1))
  })

  it("getSemigroupXor", () => {
    const S = _.getSemigroupXor<null>()
    expect(S.combine(constTrue, constTrue)(null)).toBeFalsy() // true xor true = false
    expect(S.combine(constTrue, constFalse)(null)).toBeTruthy() // true xor false = true
    expect(S.combine(constFalse, constTrue)(null)).toBeTruthy() // true xor true = true
    expect(S.combine(constFalse, constFalse)(null)).toBeFalsy() // true xor false = false
  })

  it("getMonoidXor", () => {
    const M = _.getMonoidXor<null>()
    expect(M.combine(constTrue, constTrue)(null)).toBeFalsy() // true xor true = false
    expect(M.combine(constTrue, constFalse)(null)).toBeTruthy() // true xor false = true
    expect(M.combine(constFalse, constTrue)(null)).toBeTruthy() // true xor true = true
    expect(M.combine(constFalse, constFalse)(null)).toBeFalsy() // true xor false = false
  })

  it("getSemigroupEqv", () => {
    const S = _.getSemigroupEqv<null>()
    expect(S.combine(constTrue, constTrue)(null)).toBeTruthy() // true eqv true = true
    expect(S.combine(constTrue, constFalse)(null)).toBeFalsy() // true eqv false = false
    expect(S.combine(constFalse, constTrue)(null)).toBeFalsy() // true eqv true = true
    expect(S.combine(constFalse, constFalse)(null)).toBeTruthy() // true eqv false = false
  })

  it("getMonoidEqv", () => {
    const M = _.getMonoidEqv<null>()
    expect(M.combine(constTrue, constTrue)(null)).toBeTruthy() // true eqv true = true
    expect(M.combine(constTrue, constFalse)(null)).toBeFalsy() // true eqv false = false
    expect(M.combine(constFalse, constTrue)(null)).toBeFalsy() // true eqv true = true
    expect(M.combine(constFalse, constFalse)(null)).toBeTruthy() // true eqv false = false
  })

  it("some", () => {
    const predicate = _.some([isPositive, isNegative])
    deepStrictEqual(predicate(0), false)
    deepStrictEqual(predicate(-1), true)
    deepStrictEqual(predicate(1), true)
  })

  it("every", () => {
    const predicate = _.every([isPositive, isLessThan2])
    deepStrictEqual(predicate(0), false)
    deepStrictEqual(predicate(-2), false)
    deepStrictEqual(predicate(1), true)
  })

  it("isFunction", () => {
    assert.deepStrictEqual(_.isFunction(_.isFunction), true)
    assert.deepStrictEqual(_.isFunction("function"), false)
  })

  it("isUndefined", () => {
    assert.deepStrictEqual(_.isUndefined(undefined), true)
    assert.deepStrictEqual(_.isUndefined(null), false)
    assert.deepStrictEqual(_.isUndefined("undefined"), false)
  })

  it("isNotUndefined", () => {
    assert.deepStrictEqual(_.isNotUndefined(undefined), false)
    assert.deepStrictEqual(_.isNotUndefined(null), true)
    assert.deepStrictEqual(_.isNotUndefined("undefined"), true)
  })

  it("isNull", () => {
    assert.deepStrictEqual(_.isNull(null), true)
    assert.deepStrictEqual(_.isNull(undefined), false)
    assert.deepStrictEqual(_.isNull("null"), false)
  })

  it("isNotNull", () => {
    assert.deepStrictEqual(_.isNotNull(null), false)
    assert.deepStrictEqual(_.isNotNull(undefined), true)
    assert.deepStrictEqual(_.isNotNull("null"), true)
  })

  it("isNever", () => {
    assert.deepStrictEqual(_.isNever(null), false)
    assert.deepStrictEqual(_.isNever(undefined), false)
    assert.deepStrictEqual(_.isNever({}), false)
    assert.deepStrictEqual(_.isNever([]), false)
  })

  it("isUnknown", () => {
    assert.deepStrictEqual(_.isUnknown(null), true)
    assert.deepStrictEqual(_.isUnknown(undefined), true)
    assert.deepStrictEqual(_.isUnknown({}), true)
    assert.deepStrictEqual(_.isUnknown([]), true)
  })

  it("isObject", () => {
    assert.deepStrictEqual(_.isObject({}), true)
    assert.deepStrictEqual(_.isObject([]), true)
    assert.deepStrictEqual(_.isObject(null), false)
    assert.deepStrictEqual(_.isObject(undefined), false)
  })

  it("isNullable", () => {
    assert.deepStrictEqual(_.isNullable(null), true)
    assert.deepStrictEqual(_.isNullable(undefined), true)
    assert.deepStrictEqual(_.isNullable({}), false)
    assert.deepStrictEqual(_.isNullable([]), false)
  })

  it("isNotNullable", () => {
    assert.deepStrictEqual(_.isNotNullable({}), true)
    assert.deepStrictEqual(_.isNotNullable([]), true)
    assert.deepStrictEqual(_.isNotNullable(null), false)
    assert.deepStrictEqual(_.isNotNullable(undefined), false)
  })

  it("isError", () => {
    assert.deepStrictEqual(_.isError(new Error()), true)
    assert.deepStrictEqual(_.isError(null), false)
    assert.deepStrictEqual(_.isError({}), false)
  })

  it("isDate", () => {
    assert.deepStrictEqual(_.isDate(new Date()), true)
    assert.deepStrictEqual(_.isDate(null), false)
    assert.deepStrictEqual(_.isDate({}), false)
  })

  it("isRecord", () => {
    assert.deepStrictEqual(_.isRecord({}), true)
    assert.deepStrictEqual(_.isRecord({ a: 1 }), true)

    assert.deepStrictEqual(_.isRecord([]), false)
    assert.deepStrictEqual(_.isRecord([1, 2, 3]), false)
    assert.deepStrictEqual(_.isRecord(null), false)
    assert.deepStrictEqual(_.isRecord(undefined), false)
  })

  it("isReadonlyRecord", () => {
    assert.deepStrictEqual(_.isReadonlyRecord({}), true)
    assert.deepStrictEqual(_.isReadonlyRecord({ a: 1 }), true)

    assert.deepStrictEqual(_.isReadonlyRecord([]), false)
    assert.deepStrictEqual(_.isReadonlyRecord([1, 2, 3]), false)
    assert.deepStrictEqual(_.isReadonlyRecord(null), false)
    assert.deepStrictEqual(_.isReadonlyRecord(undefined), false)
  })
})
