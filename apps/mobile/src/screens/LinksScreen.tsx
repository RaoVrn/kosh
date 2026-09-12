import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { colors, radius } from '../theme'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { ItemCreateSheet } from '../components/ItemCreateSheet'
import { Icon } from '../components/Icon'

export function LinksScreen() {
  const { items } = useItems()
  const { openItem } = useNav()
  const [creating, setCreating] = useState(false)

  const links = useMemo(
    () =>
      items
        .filter((i) => i.type === 'link')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items],
  )

  return (
    <Content>
      <PageHeader
        title="Links"
        subtitle="Useful things you want to keep."
        right={
          <Pressable
            onPress={() => setCreating(true)}
            accessibilityRole="button"
            accessibilityLabel="New link"
            style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}
          >
            <Icon name="plus" size={16} color={colors.background} />
            <Text style={styles.newBtnText}>New link</Text>
          </Pressable>
        }
      />
      {links.length === 0 ? (
        <EmptyState icon="link" title="No saved links yet" message="Save a link worth keeping." />
      ) : (
        links.map((link) => (
          <ItemCard key={link.id} item={link} onPress={() => openItem(link.id)} />
        ))
      )}
      {creating ? <ItemCreateSheet type="link" onClose={() => setCreating(false)} /> : null}
    </Content>
  )
}

const styles = StyleSheet.create({
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
})
